'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { JourneyRef } from './types';
import { LAND_TILT, emitImpact, landY } from './heroIntro';

const NEUTRAL = { introX: 0, introY: 0, introRx: 0, introRy: 0, introRz: 0, squash: 1, bulge: 1, blur: 0, shadow: 0 };

/**
 * Hero entrance: the box drops from the top centre facing the viewer, hits the ground (squash + dust),
 * bounces twice with a left/right wobble, pauses, then hops into its usual angled resting pose.
 * Everything animates offsets on top of the scroll pose, so when the entrance ends the scroll
 * choreography is exactly what it was. The hero copy and header enter alongside it.
 *
 * `armed` flips true when the page loader starts lifting. Returns true while the entrance plays.
 */
export function useHeroIntro(motion: JourneyRef, animated: boolean, armed: boolean) {
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!animated || !armed || started.current) return;
    started.current = true;
    if (window.scrollY > 40) return; // reloaded mid-page: no entrance, everything is already in place

    const state = motion.current;
    const small = window.innerWidth < 760;
    const base = { x: state.x, y: state.y, rx: state.rx, ry: state.ry, rz: state.rz };
    // Offsets that place the box at the landing spot, facing the screen.
    const ground = landY(small) - base.y;
    const land = { introX: -base.x, introRx: LAND_TILT - base.rx, introRy: -base.ry, introRz: -base.rz };
    const top = (small ? .9 : 1) - base.y;

    Object.assign(state, NEUTRAL, land, { introY: top, introRx: land.introRx + .38, introRy: land.introRy + .1, introRz: land.introRz - .06, blur: 1, shadow: 1 });
    setPlaying(true);

    const tl = gsap.timeline({ onComplete: finish });
    // Review aid: ?introSpeed=0.25 plays the entrance (and the dust clip) in slow motion.
    const speed = Number(new URLSearchParams(window.location.search).get('introSpeed')) || 1;
    if (speed !== 1) { tl.timeScale(speed); document.documentElement.dataset.introSpeed = String(speed); }
    const box = (vars: gsap.TweenVars, position: gsap.Position) => tl.to(state, vars, position);
    const squash = (at: number, depth: number) => {
      tl.to(state, { squash: 1 - depth, bulge: 1 + depth * .5, duration: .07, ease: 'power2.out' }, at)
        .to(state, { squash: 1 + depth * .22, bulge: 1 - depth * .1, duration: .13, ease: 'power2.out' }, at + .07)
        .to(state, { squash: 1, bulge: 1, duration: .16, ease: 'power2.inOut' }, at + .2);
    };

    // 1. Fall (after the copy has fully arrived and settled): gravity accelerates, the tumble straightens out before impact.
    const fall = 2.05, fallTime = .62;
    box({ introY: ground, duration: fallTime, ease: 'power2.in' }, fall);
    box({ ...land, duration: fallTime, ease: 'power1.in' }, fall);

    // 2. Impact and two decaying bounces with a little sideways life.
    const hit1 = fall + fallTime;
    tl.call(() => emitImpact(1), undefined, hit1);
    squash(hit1, .2);
    const up1 = .26, b1 = hit1 + .07;
    box({ introY: ground + (small ? .08 : .1), duration: up1, ease: 'power2.out' }, b1)
      .to(state, { introY: ground, duration: up1, ease: 'power2.in' }, b1 + up1);
    box({ introX: land.introX - .028, introRz: land.introRz + .09, introRy: land.introRy + .07, duration: up1 * 2, ease: 'sine.inOut' }, b1);

    const hit2 = b1 + up1 * 2;
    tl.call(() => emitImpact(.5), undefined, hit2);
    squash(hit2, .1);
    const up2 = .15, b2 = hit2 + .05;
    box({ introY: ground + (small ? .028 : .035), duration: up2, ease: 'power2.out' }, b2)
      .to(state, { introY: ground, duration: up2, ease: 'power2.in' }, b2 + up2);
    box({ introX: land.introX + .012, introRz: land.introRz - .04, introRy: land.introRy - .04, duration: up2 * 2, ease: 'sine.inOut' }, b2);

    const hit3 = b2 + up2 * 2;
    tl.call(() => emitImpact(.18), undefined, hit3);
    squash(hit3, .04);
    box({ ...land, duration: .3, ease: 'power2.out' }, hit3);

    // 3. A beat of stillness, a crouch, then a quick hop into the usual pose ("nobody saw that").
    const crouch = hit3 + .5;
    tl.to(state, { squash: .9, bulge: 1.04, duration: .16, ease: 'power2.inOut' }, crouch);
    const hop = crouch + .16, hopTime = .82;
    tl.to(state, { squash: 1.05, bulge: .98, duration: .12, ease: 'power2.out' }, hop)
      .to(state, { squash: 1, bulge: 1, duration: .3, ease: 'power2.inOut' }, hop + .12);
    box({ introY: Math.max(ground, 0) + (small ? .1 : .13), duration: hopTime * .45, ease: 'power2.out' }, hop)
      .to(state, { introY: 0, duration: hopTime * .55, ease: 'power2.inOut' }, hop + hopTime * .45);
    box({ introX: 0, duration: hopTime, ease: 'power2.inOut' }, hop);
    box({ introRx: 0, introRy: 0, introRz: 0, duration: hopTime, ease: 'power3.inOut' }, hop);
    box({ shadow: 0, duration: .3, ease: 'power1.out' }, hop);
    box({ blur: 0, duration: .2 }, hop + hopTime - .2);


    // 4. Copy enters first (header, then headline, then supporting lines); the impact later gives it a small jolt.
    const q = (selector: string) => gsap.utils.toArray<HTMLElement>(selector);
    const hero = '.hero-stage';
    tl.from(q('.header .menu-toggle, .header .wordmark img, .header .header-cta'), { y: -18, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out' }, .1)
      .from(q(`${hero} .hero-opening-copy .story-eyebrow`), { y: 12, opacity: 0, duration: .7, ease: 'power3.out' }, .3)
      .fromTo(q(`${hero} .hero-opening-copy h1`), { clipPath: 'inset(0% 0% 100% 0%)', y: 70 }, { clipPath: 'inset(0% 0% -15% 0%)', y: 0, duration: 1.05, ease: 'power4.out' }, .35)
      .from(q(`${hero} .hero-opening-copy h1 > span`), { yPercent: 35, opacity: 0, duration: 1, ease: 'power4.out' }, .5)
      .from(q(`${hero} .hero-opening-copy p, ${hero} .hero-kicker, ${hero} .hero-coordinates`), { y: 16, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out' }, .7)
      .from(q(`${hero} .hero-bottom > *, ${hero} .hero-side-label`), { y: 20, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, .85)
      .fromTo(q(hero), { y: 0 }, { keyframes: { y: [7, -4, 2, 0] }, duration: .32, ease: 'none' }, hit1);

    // Visitors who try to scroll or press a key don't have to wait: fast-forward to the end.
    const hurry = () => tl.timeScale(3.5);
    const events = ['wheel', 'touchstart', 'keydown'] as const;
    events.forEach(name => window.addEventListener(name, hurry, { passive: true }));

    function restore() {
      events.forEach(name => window.removeEventListener(name, hurry));
      Object.assign(state, NEUTRAL);
      gsap.set(q('.header .menu-toggle, .header .wordmark img, .header .header-cta, .hero-stage, .hero-stage .hero-opening-copy h1, .hero-stage .hero-opening-copy h1 > span, .hero-stage .hero-opening-copy .story-eyebrow, .hero-stage .hero-opening-copy p, .hero-stage .hero-kicker, .hero-stage .hero-coordinates, .hero-stage .hero-bottom > *, .hero-stage .hero-side-label'), { clearProps: 'transform,opacity,clipPath' });
    }
    function finish() { restore(); setPlaying(false); }
    // Unmount (or StrictMode's dev double-run): stop silently, put everything back, allow a fresh run.
    return () => { tl.kill(); restore(); setPlaying(false); started.current = false; };
  }, [animated, armed, motion]);

  return playing;
}
