'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Floating service image that follows the cursor while it is over a row of the services list.
 * One fixed layer sits behind the list, so the rows' difference-blended titles invert over the picture.
 * Mouse / fine-pointer only; reduced motion gets a plain fade without lag or tilt.
 */
export default function ServiceHoverPreview({ images, listSelector = '.service-list' }: { images: Array<{ src: string; alt: string }>; listSelector?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const floater = root.current;
    const list = document.querySelector<HTMLElement>(listSelector);
    if (!floater || !list || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frames = Array.from(floater.querySelectorAll<HTMLElement>('.service-preview-frame'));
    const lag = reduced ? 0 : .6;
    const moveX = gsap.quickTo(floater, 'x', { duration: lag, ease: 'power3.out' });
    const moveY = gsap.quickTo(floater, 'y', { duration: lag, ease: 'power3.out' });
    const tilt = gsap.quickTo(floater, 'rotation', { duration: reduced ? 0 : .5, ease: 'power2.out' });
    let active = -1, shown = false, lastX = 0, lastY = 0, spin = 0;

    const select = (index: number) => {
      if (index === active) return;
      active = index;
      frames.forEach((frame, i) => frame.classList.toggle('is-active', i === index));
      if (index >= 0 && !shown) {
        shown = true;
        gsap.killTweensOf(floater, 'scale,autoAlpha');
        gsap.fromTo(floater, { scale: reduced ? 1 : .7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: reduced ? .25 : .45, ease: 'power3.out' });
      } else if (index < 0 && shown) {
        shown = false;
        gsap.to(floater, { scale: reduced ? 1 : .8, autoAlpha: 0, duration: .3, ease: 'power2.in' });
      }
    };
    const rowAt = (x: number, y: number) => {
      const row = document.elementFromPoint(x, y)?.closest<HTMLElement>(`${listSelector} > *`);
      return row ? Array.prototype.indexOf.call(list.children, row) : -1;
    };
    const track = (x: number, y: number, jump: boolean) => {
      if (!reduced) spin = gsap.utils.clamp(-9, 9, spin + (x - lastX) * .35);
      lastX = x; lastY = y;
      if (jump) gsap.set(floater, { x, y }); else { moveX(x); moveY(y); }
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      track(event.clientX, event.clientY, !shown);
      select(rowAt(event.clientX, event.clientY));
    };
    const onLeave = () => select(-1);
    // Rows slide under a still cursor while scrolling: re-check what is under it.
    const onScroll = () => { if (shown) select(rowAt(lastX, lastY)); };
    // Tilt eases back to upright when the cursor stops.
    const settle = () => { spin *= .88; tilt(spin); };

    list.addEventListener('pointermove', onMove);
    list.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!reduced) gsap.ticker.add(settle);
    return () => {
      list.removeEventListener('pointermove', onMove);
      list.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      gsap.ticker.remove(settle);
      gsap.killTweensOf(floater);
    };
  }, [listSelector]);

  return <div className="service-preview" ref={root} aria-hidden="true">
    {images.map(image => <div className="service-preview-frame" key={image.src}><img src={image.src} alt="" width={900} height={900} decoding="async"/></div>)}
  </div>;
}
