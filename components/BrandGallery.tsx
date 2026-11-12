'use client';
import {ArrowUpRight} from 'lucide-react';
import {projects} from './agencyContent';
import imageSizes from './projectImageSizes.json';

export default function BrandGallery({animated}: {animated:boolean}) {
  return <div className="brand-gallery brand-editorial" data-motion={animated?'reveal':'static'} aria-label="Selected client work">
    <div className="brand-gallery-note"><span>SELECTED WORK / {String(projects.length).padStart(2,'0')} PERSPECTIVES</span><span>EVERY BRAND. ITS OWN SHAPE.</span></div>
    <div className="brand-masonry">
      {projects.map((project,index)=>{
        const dimensions=imageSizes[project.image as keyof typeof imageSizes];
        return <article className="brand-artwork" key={project.name}>
          <a href={project.href} target="_blank" rel="noreferrer" aria-label={`View ${project.fullName} project`}>
            <div className="brand-artwork-image"><img src={project.image} alt={`${project.fullName} — ${project.category} by The Vivid View`} width={dimensions.width} height={dimensions.height} loading="lazy"/></div>
            <div className="brand-artwork-caption"><span className="brand-artwork-number">{String(index+1).padStart(2,'0')}</span><div><h3>{project.fullName}</h3><p>{project.category}</p></div><ArrowUpRight size={22}/></div>
          </a>
        </article>;
      })}
    </div>
  </div>;
}
