'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { JourneyRef } from './types';
import { BOX_HALF, boxScaleFactor } from './heroIntro';

function finishTexture(color: string, lettering = false) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=color;ctx.fillRect(0,0,1024,1024);
  ctx.strokeStyle='#292b2c';ctx.lineWidth=4;ctx.strokeRect(2,2,1020,1020);
  if(lettering){
    ctx.fillStyle='#f2f0e9';ctx.font='900 128px Arial';
    ctx.fillText('IDEAS',90,350);ctx.fillText('WITHOUT',90,492);ctx.fillText('LIMITS.',90,634);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

export default function CardboardBox({ motion, sculpture }: { motion: JourneyRef; sculpture: {texture: {value: THREE.Texture}; size: {value: THREE.Vector2}} }) {
  const root = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const { viewport, size } = useThree();
  const resources = useMemo(() => {
    const maps = [finishTexture('#444440'), finishTexture('#292927',true), finishTexture('#353532'), finishTexture('#4b4b46'), finishTexture('#f4f2eb')];
    const glow = {value: 0};
    const materials = maps.map(map => new THREE.MeshPhysicalMaterial({ map, roughness: .32, metalness: .22, clearcoat: .65, clearcoatRoughness: .22, envMapIntensity: 1.1 }));
    materials.forEach(material => {
      material.onBeforeCompile=shader=>{
        shader.uniforms.uSculptureGlow=glow;
        shader.uniforms.uSculptureMap=sculpture.texture;
        shader.uniforms.uSculptureSize=sculpture.size;
        shader.fragmentShader='uniform float uSculptureGlow; uniform sampler2D uSculptureMap; uniform vec2 uSculptureSize;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight=mix(outgoingLight,diffuseColor.rgb,uSculptureGlow);\n#include <opaque_fragment>');
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          vec3 glowingFace=mix(diffuseColor.rgb,vec3(.91,.97,1.),uSculptureGlow*.86);
          vec4 bust=texture2D(uSculptureMap,gl_FragCoord.xy/uSculptureSize);
          vec3 sculptureColor=clamp(bust.rgb/max(bust.a,.001),0.,1.);
          vec3 differenceColor=abs(glowingFace-sculptureColor);
          diffuseColor.rgb=mix(glowingFace,differenceColor,uSculptureGlow*smoothstep(.01,.95,bust.a));
        `);
      };
    });
    const faceMaterials = (outside: number, axis: number) => {
      const faces = Array.from({length: 6}, () => materials[0]);
      faces[axis] = materials[outside]; faces[axis ^ 1] = materials[4];
      return faces;
    };
    const geometry = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    return { maps, materials, glow, leftMaterials: faceMaterials(3,1), rightMaterials: faceMaterials(2,0), frontMaterials: faceMaterials(1,4), backMaterials: faceMaterials(2,5), floorMaterials: faceMaterials(4,2), flapMaterials: faceMaterials(0,2), side: geometry(.016, 1.9, 1.9), face: geometry(1.9, 1.9, .016), bottom: geometry(1.9, .016, 1.9), wideFlap: geometry(1.9, .016, .95), narrowFlap: geometry(.95, .016, 1.9) };
  }, [sculpture]);
  useEffect(() => { root.current?.traverse(child => child.layers.set(1)); }, []);
  useEffect(() => () => {
    resources.maps.forEach(texture => texture.dispose()); resources.materials.forEach(material => material.dispose());
    [resources.side, resources.face, resources.bottom, resources.wideFlap, resources.narrowFlap].forEach(geometry => geometry.dispose());
  }, [resources]);
  useFrame((_, delta) => {
    if (!root.current) return;
    const state = motion.current;

    const small = size.width < 760;

    // Scroll pose plus the hero-entrance offsets (neutral once the entrance ends). Squash pivots on the base.
    const scale = state.scale * boxScaleFactor(small);
    root.current.position.set((state.x + state.introX) * viewport.width, (state.y + state.introY) * viewport.height - (1 - state.squash) * BOX_HALF * scale, .7);
    root.current.rotation.set(state.rx + state.introRx, state.ry + state.introRy, state.rz + state.introRz);
    root.current.scale.set(scale * state.bulge, scale * state.squash, scale * state.bulge);
    
    const outer = THREE.MathUtils.smoothstep(state.open, 0, .46);
    const inner = THREE.MathUtils.smoothstep(state.open, .54, 1);
    back.current!.rotation.x = -outer * 2.12;
    front.current!.rotation.x = outer * 2.12;
    left.current!.rotation.z = inner * 2.18;
    right.current!.rotation.z = -inner * 2.18;
    const canvas = document.querySelector<HTMLElement>('.journey-canvas');
    if (canvas) { canvas.dataset.boxDimensions='1.9,1.9,1.9'; canvas.dataset.boxPanelThickness='0.016'; canvas.dataset.boxHingeHeight='0.95'; canvas.dataset.outerFlaps=outer.toFixed(3); canvas.dataset.innerFlaps=inner.toFixed(3); }
    
    
    resources.glow.value = state.glow * state.head;
    if (light.current) light.current.intensity = THREE.MathUtils.damp(light.current.intensity, state.glow * 1.2, 5, delta);
    root.current.userData.openness = state.open;
    root.current.userData.glow = state.glow;
  });
  return <group ref={root} name="travelling-sculptural-box">
    <mesh name="left-wall" geometry={resources.side} material={resources.leftMaterials} position={[-.95, 0, 0]}/>
    <mesh name="right-wall" geometry={resources.side} material={resources.rightMaterials} position={[.95, 0, 0]}/>
    <mesh name="front-wall" geometry={resources.face} material={resources.frontMaterials} position={[0, 0, .95]}/>
    <mesh name="back-wall" geometry={resources.face} material={resources.backMaterials} position={[0, 0, -.95]}/>
    <mesh name="empty-interior-floor" geometry={resources.bottom} material={resources.floorMaterials} position={[0, -.95, 0]}/>
    <group ref={left} name="left-hinge" position={[-.95,.95,0]}><mesh position={[.475,-.008,0]} geometry={resources.narrowFlap} material={resources.flapMaterials}/></group>
    <group ref={right} name="right-hinge" position={[.95,.95,0]}><mesh position={[-.475,-.008,0]} geometry={resources.narrowFlap} material={resources.flapMaterials}/></group>
    <group ref={front} name="front-hinge" position={[0,.95,.95]}><mesh position={[0,.008,-.475]} geometry={resources.wideFlap} material={resources.flapMaterials}/></group>
    <group ref={back} name="back-hinge" position={[0,.95,-.95]}><mesh position={[0,.008,.475]} geometry={resources.wideFlap} material={resources.flapMaterials}/></group>
    <pointLight ref={light} position={[0, 0, 0]} color="#eff5ff" intensity={0} distance={5} decay={2}/>
  </group>;
}


