'use client';

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, ArrowDown, ArrowLeft, ArrowRight, Plus, Minus, X, Check } from 'lucide-react';
import { initialJourney } from './journey/types';
import { useJourney } from './journey/useJourney';
import StaticBox from './journey/StaticBox';
import BrandGallery from './BrandGallery';
import {agency, services, team, stories} from './agencyContent';

const ForegroundBox = dynamic(() => import('./journey/JourneyScene').then(module => module.ForegroundBox), { ssr: false });
const JourneyScene = dynamic(() => import('./journey/JourneyScene'), { ssr: false });
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Words({ children }: { children: string }) {
  return <span className="word-reveal" aria-label={children}>{children.split(' ').map((word, index) => <span className="word-mask" aria-hidden="true" key={`${word}-${index}`}><span className="word-inner">{word}</span>{' '}</span>)}</span>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [service, setService] = useState<number | null>(0);
  const [quote, setQuote] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [briefReady, setBriefReady] = useState(false);
  const [briefText,setBriefText]=useState('');
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const contactTrigger = useRef<HTMLElement | null>(null);
  const motion = useRef({ ...initialJourney });
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const onSceneFailure = useCallback(() => { setSceneFailed(true); setSceneReady(false); }, []);
  const animated = motionEnabled && !sceneFailed;
  useJourney(motion, animated, contactOpen);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionEnabled(!preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (contactOpen) dialog.current?.showModal();
    else { dialog.current?.close(); contactTrigger.current?.focus(); }
  }, [contactOpen]);
  function openContact() { contactTrigger.current = document.activeElement as HTMLElement; setBriefReady(false); setContactOpen(true); setMenuOpen(false); }
  function closeMenu() { setMenuOpen(false); }

  return <div className={`experience ${animated ? 'motion-on' : 'motion-off'} ${sceneReady ? 'scene-loaded' : ''}`}>
    {animated && <div className="journey-canvas" aria-hidden="true"><SceneBoundary onFailure={onSceneFailure}><JourneyScene motion={motion} onReady={onSceneReady} paused={contactOpen}/></SceneBoundary></div>}
    {animated && <div className="box-foreground" aria-hidden="true"><SceneBoundary onFailure={onSceneFailure}><ForegroundBox motion={motion} paused={contactOpen}/></SceneBoundary></div>}
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="header">
      <button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={18}/> : <span className="menu-dots"><i/><i/><i/><i/></span>}<span>{menuOpen ? 'CLOSE' : 'EXPLORE'}</span></button>
      <nav id="main-navigation" aria-label="Main navigation" className={menuOpen ? 'navigation open' : 'navigation'}><a href="#brands" onClick={closeMenu}>The brands <sup>01</sup></a><a href="#services" onClick={closeMenu}>What we do <sup>02</sup></a><a href="#people" onClick={closeMenu}>The minds <sup>03</sup></a><a href="#perspectives" onClick={closeMenu}>The impact <sup>04</sup></a><button onClick={openContact}>Start something <ArrowUpRight/></button></nav>
      <a className="wordmark" href="#" aria-label="Vivid View home"><img src="/images/agency/vivid-view-logo.png" alt="The Vivid View" width={120} height={64}/></a>
      <button className="header-cta" onClick={openContact}>LET’S THINK BIGGER <span><ArrowUpRight size={17}/></span></button>
    </header>
    <main id="main">
      <section className="hero" id="opening" aria-labelledby="hero-title">
        <div className="hero-stage"><div className="hero-backtype" aria-hidden="true">BEYOND<br/>THE BOX.</div>
          <div className="hero-grid" aria-hidden="true"><i/><i/><i/></div>
          <div className="hero-kicker"><span className="crosshair">+</span><span>INDEPENDENT CREATIVE AGENCY<br/>HYDERABAD. IDEAS WITHOUT EDGES.</span></div>
          <div className="hero-coordinates">ONE ORDINARY BOX.<br/><span>AN EXTRAORDINARY WAY OF THINKING.</span></div>
          <div className="hero-opening-copy"><span className="story-eyebrow">THE WORLD DOESN’T NEED ANOTHER BOX.</span><h1 id="hero-title">THINK<br/><span>OUTSIDE.</span></h1><p>Great ideas were never meant to fit in.</p></div>
          <div className="hero-inside-copy"><span className="story-eyebrow">GO ON. TAKE A LOOK.</span><h2>NOTHING<br/>IN HERE.</h2><p>That’s exactly the point.<br/>Our ideas live outside the box.</p></div>
          <div className="hero-outside-copy"><span className="story-eyebrow">A NEW POINT OF VIEW.</span><h2>OUR IDEAS<br/>DON’T FIT.</h2><p>Not in a box. Not in a category.<br/>And definitely not in the expected.</p></div>
          <div className="idea-orbit" aria-hidden="true"><span data-spread="-35">[ UNEXPECTED PERSPECTIVES ]</span><span data-spread="25">[ UNLIMITED POSSIBILITIES ]</span><span data-spread="-25">[ UNCONVENTIONAL THINKING ]</span><span data-spread="35">[ UNMISTAKABLY YOU ]</span></div>
          <div className="journey-fallback"><StaticBox/></div>
          <div className="hero-side-label">VV / THINKING OUTSIDE THE BOX</div>
          <div className="hero-bottom"><p>Strategy. Creativity. Culture.<br/><span>Same world. A different way to see it.</span></p><a className="hero-enter" href={animated ? '#open-the-box' : '#brands'} onClick={event => { if (animated) { event.preventDefault(); window.scrollTo({ top: (document.getElementById('opening')!.offsetHeight - window.innerHeight) * .59, behavior: 'smooth' }); } }}><span>{animated ? 'SCROLL TO OPEN YOUR MIND' : 'EXPLORE OUR WORLD'}</span><span className="square-arrow"><ArrowDown size={22} strokeWidth={1}/></span></a><div className="opening-steps"><span>01 OPEN</span><span>02 LOOK IN</span><span>03 THINK OUT</span></div></div>
        </div>
      </section>

      <section id="brands" className="brands section-pad" aria-labelledby="brands-title">
        <div className="section-label"><span>[01 — BEYOND THE BOUNDARIES]</span><span>DIFFERENT IS WHERE WE BEGIN.</span><span>FOLLOW THE POSSIBILITY ↘</span></div>
        <div className="brands-intro"><h2 id="brands-title"><Words>BUILT FOR</Words><br/><span className="outline-text"><Words>THE BOLD.</Words></span></h2><div data-reveal><span className="small-cross">✳</span><p>The best thing about a box?<br/>Thinking beyond it.</p><p className="muted-copy">We are The Vivid View, an independent, full-service creative agency. From branding and media to digital experiences, we help businesses find their voice and own their space.</p></div></div>
        <BrandGallery animated={animated}/>
        <div className="brands-bottom"><p>THE NEXT GREAT BRAND STORY<br/>COULD BE YOURS.</p><button className="line-link" onClick={openContact}>LET’S FIND YOUR EDGE <ArrowUpRight size={16}/></button><span className="concept-note">Real brands. Real collaborations.<br/>Explore the stories behind the work.</span></div>
        <div className="brand-strip" aria-label="Selected clients"><span>THVANI</span><span className="brand-red">HUNGRY BROZ</span><span className="brand-north">KANDASAMI</span><span className="brand-kin">SHADAB</span></div>
      </section>

      <section id="services" className="services section-pad" aria-labelledby="services-title">
        <div className="section-label"><span>[02 — IDEAS IN MOTION]</span><span>CONNECTED THINKING.</span><span>NO THINKING IN SILOS.</span></div>
        <div className="services-heading"><h2 id="services-title"><Words>NO BOXES.</Words><br/><span><Words>NO LIMITS.</Words></span></h2><p data-reveal>From a spark of an idea<br/>to a shift in your business.<br/>This is how we make it happen.</p></div>
        <div className="service-layout"><div className="journey-window"><span className="window-corner">+</span><span className="window-label">A DIFFERENT WAY TO {services[service ?? 0].word}.</span><span className="window-note">IDEAS ARE FLUID.<br/>GIVE THEM ROOM TO MOVE.</span><div className="service-static"><StaticBox/></div></div><div className="service-list">{services.map((item, index) => <article className={`service-item ${service === index ? 'active' : ''}`} key={item.name}><button className="service-toggle" aria-expanded={service === index} aria-controls={`service-panel-${index}`} id={`service-toggle-${index}`} onClick={() => setService(current => current === index ? null : index)}><span className="service-number">/ 0{index + 1}</span><span><small>{item.category}</small><strong>{item.name}</strong></span><span className="service-plus">{service === index ? <Minus size={19}/> : <Plus size={19}/>}</span></button><div className="service-panel" id={`service-panel-${index}`} role="region" aria-labelledby={`service-toggle-${index}`} aria-hidden={service !== index} inert={service !== index}><div className="service-panel-inner"><div className="service-panel-content"><p>{item.text}</p><div className="tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></div></div></article>)}</div></div>
      </section>

      <section id="people" className="people" aria-labelledby="people-title"><div className="people-stage section-pad">
        <div className="section-label"><span>[03 — THE MINDS BEHIND IT]</span><span>A DIFFERENT STATE OF MIND.</span><span>LET THERE BE IDEAS.</span></div>
        <div className="mind-copy"><span className="story-eyebrow">A BOX CAN FRAME A THOUGHT. NEVER CONTAIN IT.</span><h2 id="people-title"><Words>LIMITS OFF.</Words><br/><span><Words>LIGHTS ON.</Words></span></h2><p data-reveal>Brand thinkers. Designers. Storytellers.<br/>20+ creative minds, one Vivid View.</p><div className="mind-disciplines real-team" data-reveal>{team.map(person=><a href="https://thevividview.in/who-are-we" target="_blank" rel="noreferrer" key={person.name}><span>{person.name.toUpperCase()}<small>{person.role.toUpperCase()}</small></span><ArrowUpRight size={13}/></a>)}</div><button className="line-link" onClick={openContact}>MEET YOUR CREATIVE PARTNERS <ArrowUpRight size={16}/></button></div>
        <div className="static-mind"><img src="/images/v2/chrome-bust.webp" alt="A sculptural portrait representing a different perspective" loading="lazy"/></div><div className="mind-caption"><span>RITESH POSHETWAR / CEO, THE VIVID VIEW</span><span>RUPESH POSHETWAR / CEO, VIVID STUDIOS</span></div>
      </div></section>

      <section id="perspectives" className="testimonials section-pad" aria-labelledby="testimonials-title">
        <div className="section-label"><span>[04 — WHAT HAPPENS OUTSIDE]</span><span>REAL BRANDS. REAL STORIES.</span><span>A CLOSER LOOK AT THE WORK.</span></div>
        <div className="quote-heading"><h2 id="testimonials-title"><Words>THINK DIFFERENT.</Words><br/><span><Words>FEEL THE DIFFERENCE.</Words></span></h2></div><div className="quote-layout"><div className="quote-sidebar"><span className="quote-counter">0{quote + 1}<small>/ 03</small></span><p>Project stories from our portfolio.<br/>The thinking behind the work.</p></div><div className="quote-main" aria-live="polite" aria-atomic="true"><p className="project-story-copy" key={quote}>{stories[quote].text}</p><div className="quote-bottom"><div><strong>{stories[quote].name}</strong><span>{stories[quote].category}</span></div><a className="story-source" href={stories[quote].href} target="_blank" rel="noreferrer">VIEW PROJECT <ArrowUpRight size={14}/></a><div className="quote-controls"><button aria-label="Previous story" onClick={() => setQuote((quote + 2) % 3)}><ArrowLeft size={20}/></button><button aria-label="Next story" onClick={() => setQuote((quote + 1) % 3)}><ArrowRight size={20}/></button></div></div></div></div>
      </section>
    </main>
    <footer className="footer section-pad" id="contact"><div className="section-label"><span>THE BOX ENDS HERE. THE POSSIBILITIES DON’T.</span><span>OPEN MINDS. OPEN POSSIBILITIES.</span><span>YOUR NEXT CHAPTER ↗</span></div><button className="footer-title" onClick={openContact}><span>WHAT’S OUTSIDE<br/>YOUR <em>BOX?</em></span><ArrowUpRight strokeWidth={.8}/></button><div className="footer-bottom"><a className="wordmark" href="#"><img src="/images/agency/vivid-view-logo.png" alt="The Vivid View" width={120} height={64}/></a><p><a href={`mailto:${agency.email}`}>{agency.email}</a><br/><a href={agency.phoneHref}>{agency.phone}</a></p><div><button onClick={() => setShowCredits(!showCredits)} aria-expanded={showCredits}>CREDITS & SOURCES <Plus size={12}/></button><span>© {new Date().getFullYear()} VIVID VIEW</span><a href="#">BACK TO TOP ↑</a></div></div><div className="agency-links"><span>{agency.location}</span><a href={agency.instagram} target="_blank" rel="noreferrer">INSTAGRAM ↗</a><a href={agency.linkedin} target="_blank" rel="noreferrer">LINKEDIN ↗</a><a href={agency.contactUrl} target="_blank" rel="noreferrer">LET'S TALK ↗</a></div><div className="model-credit">Mind sculpture: <a href="https://sketchfab.com/3d-models/girl-bust-c1b8da5fb7644ec4937e38123a687f78" target="_blank" rel="noreferrer">“Girl bust” by DanP38</a> / <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> / Modified geometry, materials, and lighting. Box designed for Vivid View.</div>{showCredits && <div className="credits"><p>Agency content, logo and client imagery sourced from thevividview.in. Project stories summarise published work; they are not client testimonials.</p><p>Project photography and brand artwork belong to their respective owners. The sculpture is used under the attribution license below.</p></div>}</footer>
    <div className="journey-meter" aria-hidden="true"><span className="journey-meter-fill"/></div>
    <dialog ref={dialog} className="contact-dialog" onCancel={() => setContactOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setContactOpen(false); }}><div className="contact-inner" data-lenis-prevent><button className="dialog-close" aria-label="Close project brief" onClick={() => setContactOpen(false)}><X/></button><span className="eyebrow">GOOD THINGS START WITH A CONVERSATION</span><h2>Your next<br/><span className="serif">big thing.</span></h2>{briefReady ? <div className="brief-success" role="status"><Check size={40}/><h3>Your brief is ready.</h3><p>Your copy has been downloaded. Send it to our team using your email app, or continue to our enquiry form.</p><a className="primary-button" href={`mailto:${agency.email}?subject=${encodeURIComponent("A new project for The Vivid View")}&body=${encodeURIComponent(briefText)}`}>Email my brief <ArrowUpRight size={18}/></a><a className="line-link" href={agency.contactUrl} target="_blank" rel="noreferrer">Open our enquiry form <ArrowUpRight size={16}/></a></div> : <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const content = `VIVID VIEW — PROJECT BRIEF\n\nName: ${data.get('name')}\nEmail: ${data.get('email')}\nInterested in: ${data.get('interest')}\n\nThe idea:\n${data.get('idea')}\n`; const url = URL.createObjectURL(new Blob([content], {type: 'text/plain'})); const link = document.createElement('a'); link.href = url; link.download = 'vivid-view-project-brief.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setBriefText(content); setBriefReady(true); }}><div className="form-row"><label>Your name<input name="name" autoComplete="name" placeholder="Alex Taylor" required maxLength={100}/></label><label>Email address<input name="email" type="email" autoComplete="email" placeholder="alex@yourbrand.com" required maxLength={200}/></label></div><label>What are you thinking?<select name="interest">{services.map(item=><option key={item.name}>{item.name}</option>)}<option>A little bit of everything</option></select></label><label>Tell us the big idea<textarea name="idea" placeholder="The ambition, the challenge, the what if…" required maxLength={4000} rows={3}/></label><p className="form-note">Prepare your brief, then send it to contact@thevividview.in. You can also call +91 90002 19712.</p><button className="primary-button" type="submit">Create my project brief <ArrowUpRight size={18}/></button></form>}</div></dialog>
  </div>;
}
