'use client';

import {useEffect, useRef, useState, type PointerEvent} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight} from 'lucide-react';
import {projects} from './agencyContent';

export default function BrandGallery({animated}: {animated: boolean}) {
  const root=useRef<HTMLDivElement>(null);
  const track=useRef<HTMLDivElement>(null);
  const [page,setPage]=useState(0);
  const state=useRef({scroll:0,offset:0,target:0,current:0,width:1,drag:false,startX:0,startY:0,start:0,moved:false,frame:0});
  const pages=Math.ceil(projects.length/2);
  const move=useRef<(value:number)=>void>(()=>{});

  useEffect(()=>{
    const element=root.current!, rail=track.current!, s=state.current;
    const clamp=(n:number)=>Math.max(0,Math.min(pages-1,n));
    const draw=()=>{
      s.current=animated?s.current+(s.target-s.current)*.16:s.target;
      rail.style.transform=`translate3d(${-s.current*s.width}px,0,0)`;
      rail.querySelectorAll<HTMLElement>('.gallery-page').forEach((panel,i)=>{
        const distance=i-s.current;
        panel.style.transform=animated?`translateY(${Math.sin(distance*Math.PI*.5)*28}px) rotate(${Math.max(-1,Math.min(1,distance))*2.5}deg)`:'none';
        const active=Math.abs(distance)<.6;
        panel.inert=!active;
        panel.setAttribute('aria-hidden',String(!active));
      });
      element.dataset.galleryPosition=s.current.toFixed(3);
      setPage(Math.round(s.current));
      if(Math.abs(s.target-s.current)>.001)s.frame=requestAnimationFrame(draw);else s.frame=0;
    };
    const queue=()=>{if(!s.frame)s.frame=requestAnimationFrame(draw)};
    move.current=value=>{s.target=clamp(value);s.offset=s.target-s.scroll;queue()};
    const update=()=>{
      s.width=element.clientWidth;
      if(animated&&!s.drag){
        const rect=element.getBoundingClientRect();
        s.scroll=clamp((innerHeight*.66-rect.top)/Math.max(rect.height*.72,1)*(pages-1));
        s.target=clamp(s.scroll+s.offset);
      }
      queue();
    };
    const resize=new ResizeObserver(update);resize.observe(element);
    window.addEventListener('scroll',update,{passive:true});update();
    return()=>{resize.disconnect();window.removeEventListener('scroll',update);cancelAnimationFrame(s.frame);s.frame=0};
  },[animated,pages]);

  function down(event:PointerEvent<HTMLDivElement>){
    if(event.button!==0)return;
    const s=state.current;s.drag=true;s.startX=event.clientX;s.startY=event.clientY;s.start=s.current;s.moved=false;
  }
  function drag(event:PointerEvent<HTMLDivElement>){
    const s=state.current;if(!s.drag)return;
    const dx=event.clientX-s.startX,dy=event.clientY-s.startY;
    if(!s.moved&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>10){s.drag=false;return}
    if(Math.abs(dx)>7){s.moved=true;event.currentTarget.setPointerCapture(event.pointerId);move.current(s.start-dx/s.width)}
  }
  function up(event:PointerEvent<HTMLDivElement>){
    const s=state.current;if(!s.drag)return;s.drag=false;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(s.moved){const dx=event.clientX-s.startX;move.current(Math.abs(dx)>s.width*.12?Math.round(s.start)+(dx<0?1:-1):Math.round(s.current))}
  }

  return <div className="brand-gallery" ref={root} role="region" aria-roledescription="carousel" aria-label="Selected client work">
    <div className="gallery-viewport" onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={event=>{state.current.drag=false;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);move.current(Math.round(state.current.current))}} onClickCapture={event=>{if(state.current.moved){event.preventDefault();event.stopPropagation();state.current.moved=false}}}>
      <div className="gallery-track" ref={track}>
        {Array.from({length:pages},(_,group)=><div className="gallery-page campaigns" key={group} role="group" aria-label={`${group+1} of ${pages}`}>
          {projects.slice(group*2,group*2+2).map((project,index)=><article className={`campaign ${index?'campaign-red':'campaign-white'}`} key={project.name}>
            <a className="campaign-image" href={project.href} target="_blank" rel="noreferrer" aria-label={`View ${project.fullName} project`} draggable={false}>
              <img src={project.image} alt={`${project.fullName} — ${project.category} by The Vivid View`} loading="lazy" draggable={false} style={{objectPosition:project.position}}/>
              <span className="campaign-index">0{group*2+index+1} / {project.category.toUpperCase()}</span>
              <h3>{project.name.toUpperCase()}</h3><span className="campaign-caption">{project.line.toUpperCase()}</span>
            </a>
            <div className="campaign-meta"><span>{project.fullName.toUpperCase()}</span><span>{project.category.toUpperCase()} <ArrowUpRight size={12}/></span></div>
          </article>)}
        </div>)}
      </div>
    </div>
    <div className="gallery-controls"><span>DRAG TO DISCOVER / SCROLL TO EXPLORE</span><span aria-live="polite">0{page+1} / 0{pages}</span><div><button aria-label="Previous projects" disabled={page===0} onClick={()=>move.current(page-1)}><ArrowLeft size={18}/></button><button aria-label="Next projects" disabled={page===pages-1} onClick={()=>move.current(page+1)}><ArrowRight size={18}/></button></div></div>
  </div>;
}
