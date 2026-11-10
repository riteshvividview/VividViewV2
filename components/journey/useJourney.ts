'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initialJourney, type JourneyRef, type JourneyState } from './types';

gsap.registerPlugin(ScrollTrigger);

export function useJourney(motion: JourneyRef, enabled: boolean, paused: boolean) {
  const lenis = useRef<Lenis | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const smooth = new Lenis({ duration: 1.08, anchors: true, smoothWheel: true });
    lenis.current = smooth;
    smooth.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => smooth.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    let master: gsap.core.Timeline | undefined;
    let driver: ScrollTrigger | undefined;
    let timeout: ReturnType<typeof setTimeout>;
    let alive = true;
    const root = document.documentElement;
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const bounds = (id: string) => {
      const element = document.getElementById(id)!;
      const top = element.getBoundingClientRect().top + window.scrollY;
      return { top, bottom: top + element.offsetHeight, height: element.offsetHeight };
    };
    function build() {
      if (!alive) return;
      master?.kill(); driver?.kill();
      const vh = window.innerHeight;
      const small = window.innerWidth < 760;
      const rail = small ? .29 : .4;
      const mindX = small ? 0 : -.24;
      const heroEnd = hero.offsetHeight - vh;
      const brands = bounds('brands'); const services = bounds('services'); const people = bounds('people'); const quotes = bounds('perspectives'); const footer = bounds('contact');
      const total = Math.max(1, ScrollTrigger.maxScroll(window));
      const start = { ...initialJourney, x: small ? .08 : .23, y: small ? -.17 : .015, scale: small ? 1.08 : 1.5 };
      const keys: Array<[number, Partial<JourneyState>]> = [
        [0, start],
        [heroEnd * .035, { ...start }],
        [heroEnd * .48, { x: small ? 0 : .1, open: 1, rx: .45, ry: -.25, rz: 0 }],
        [heroEnd * .68, { x: 0, y: small ? -.13 : .015, rx: Math.PI / 2, ry: 0, open: 1, scale: small ? .78 : 1.02, liquidX: -.25, liquidY: -.3, liquidTurn: .15 }],
        [heroEnd * .82, { x: 0, y: small ? -.13 : .015, rx: Math.PI / 2, open: 1 }],
        [heroEnd, { x: rail, y: .04, scale: .55, rx: .32, ry: .65, rz: .1, open: 0, liquidX: .27, liquidY: -.29, liquidTurn: -.4, liquidScale: .72 }],
        [brands.top + .1 * vh, { x: rail, y: .06, scale: .51, ry: 1.15, rz: -.08 }],
        [brands.bottom - vh, { x: rail, y: -.06, scale: .49, ry: 4.8, rz: .12, liquidX: .32, liquidY: -.28, liquidTurn: .5 }],
        [services.top + vh * .12, { x: small ? 0 : -.26, y: small ? -.05 : -.1, scale: .78, rx: .45, ry: 5.85, rz: -.08, open: .85, liquidX: small ? 0 : -.25, liquidY: -.29, liquidScale: .72, liquidTurn: -.2 }],
        [services.bottom - vh * .8, { x: small ? 0 : -.26, y: -.05, open: .55, ry: 6.55, rz: .06 }],
        [people.top - vh * .3, { x: mindX, y: .3, scale: .72, rx: 2, ry: 6.2, open: .3, dark: .25, head: .05, liquidX: small ? .05 : -.15, liquidY: -.36, liquidScale: .8 }],
        [people.top + vh * .2, { x: mindX, y: .31, scale: .87, rx: Math.PI, ry: 6.65, rz: 0, open: 0, dark: 1, head: 1, glow: 0 }],
        [people.top + vh * .75, { x: mindX, y: small ? .025 : .035, scale: small ? .72 : .87, glow: 1, head: 1, dark: 1, liquidTurn: -.42 }],
        [people.bottom - vh * 1.1, { x: mindX, y: small ? .025 : .035, glow: 1, head: 1, headDissolve: 0, dark: 1 }],
        [people.bottom - vh * .4, { x: mindX, y: .32, glow: 0, head: 1, headDissolve: .65, dark: .55, rx: Math.PI + .45 }],
        [quotes.top + vh * .13, { x: rail, y: .04, scale: .5, rx: Math.PI * 2 + .35, ry: 7, rz: -.07, open: .2, dark: 0, head: 0, headDissolve: 1, glow: 0, liquidX: .3, liquidY: -.28, liquidTurn: .3, liquidScale: .65 }],
        [footer.top - vh * .08, { x: small ? .19 : .32, y: .025, scale: .69, rx: Math.PI * 2 + .6, ry: 6.6, open: .75, liquidX: .15, liquidY: -.31, liquidScale: .95, liquidTurn: -.25 }],
        [total, { x: small ? .2 : .32, y: .07, scale: .7, rx: Math.PI * 2 + 1.12, ry: 6.5, open: 1, dark: 0, head: 0, glow: 0 }],
      ];
      Object.assign(motion.current, start);
      const updateTheme = () => {
        const state = motion.current;
        root.style.setProperty('--journey-ink', gsap.utils.interpolate('#242622', '#edece3', state.dark));
        root.style.setProperty('--journey-muted', gsap.utils.interpolate('#707367', '#abb6a6', state.dark));
        root.style.setProperty('--journey-line', gsap.utils.interpolate('#b9beb1', '#535e52', state.dark));
        hero.style.setProperty('--hero-progress', String(state.hero));
        document.querySelector<HTMLElement>('.journey-meter-fill')?.style.setProperty('transform', `scaleX(${state.progress})`);
      };
      master = gsap.timeline({ paused: true, onUpdate: updateTheme });
      let previous = 0;
      for(let i=1;i<keys.length;i++) {
        const point=Math.max(previous,Math.min(total,keys[i][0]));
        master.to(motion.current,{...keys[i][1],duration:(point-previous)/total,ease:'none'},previous/total);
        previous=point;
      }
      master.to(motion.current,{hero:1,duration:heroEnd/total,ease:'none'},0);
      master.to(motion.current,{progress:1,duration:1,ease:'none'},0);
      driver=ScrollTrigger.create({animation:master,start:0,end:()=>ScrollTrigger.maxScroll(window),scrub:true,invalidateOnRefresh:true});
      driver.refresh();master.progress(Math.min(window.scrollY/total,1));


    }
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(element => {
        gsap.fromTo(element, { y: 45, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 91%', toggleActions: 'play none none reverse' } });
      });
      gsap.utils.toArray<HTMLElement>('.word-reveal').forEach(heading => {
        gsap.fromTo(heading.querySelectorAll('.word-inner'), { yPercent: 110, rotateX: -25, opacity: .1 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.15, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: heading, start: 'top 88%', toggleActions: 'play none none reverse' } });
      });
      const heroTimeline = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true } });
      heroTimeline.to('.hero-opening-copy', { y: -55, opacity: 0, duration: .2 }, .13)
        .fromTo('.hero-inside-copy', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .14 }, .38)
        .to('.hero-inside-copy', { opacity: 0, y: -35, duration: .12 }, .72)
        .fromTo('.hero-outside-copy', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .13 }, .8)
        .fromTo('.idea-orbit span', { opacity: 0, x: 0, y: 15 }, { opacity: 1, x: (_: number, el: Element) => Number((el as HTMLElement).dataset.spread || 0), y: 0, stagger: .018, duration: .14 }, .44)
        .to('.idea-orbit', { opacity: 0, duration: .12 }, .76);
      gsap.utils.toArray<HTMLElement>('.campaign-image img').forEach(image => gsap.fromTo(image, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.12, ease: 'none', scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
      gsap.utils.toArray<HTMLElement>('.brands-intro h2,.services-heading h2,.quote-heading h2,.journey-window .window-label').forEach((element,index)=>{
        const distance=index===3?20:28;
        gsap.fromTo(element,{y:distance},{y:-distance,ease:'none',scrollTrigger:{trigger:element,start:'top bottom',end:'bottom top',scrub:true}});
      });
      build();
    });
    const refresh = () => { clearTimeout(timeout); timeout = setTimeout(() => { build(); ScrollTrigger.refresh(); }, 140); };
    const observer = new ResizeObserver(refresh);
    document.querySelectorAll('main > section, footer').forEach(section => observer.observe(section));
    window.addEventListener('resize', refresh);
    document.fonts.ready.then(refresh);
    return () => {
      alive = false; clearTimeout(timeout); observer.disconnect(); window.removeEventListener('resize', refresh);
      master?.kill(); driver?.kill(); context.revert(); gsap.ticker.remove(tick); smooth.destroy(); lenis.current = null;
      ['--journey-ink', '--journey-muted', '--journey-line', '--journey-dark'].forEach(property => root.style.removeProperty(property));
    };
  }, [enabled, motion]);
  useEffect(() => { if (paused) lenis.current?.stop(); else lenis.current?.start(); }, [paused]);
}

