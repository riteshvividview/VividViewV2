'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import CardboardBox from './CardboardBox';
import SilverFluid from './SilverFluid';
import type { JourneyRef } from './types';
import {applySculptureDissolve} from './sculptureDissolve';

function Backdrop({ motion }: { motion: JourneyRef }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uDark: { value: 0 }, uLight: { value: new THREE.Color('#e7e6df') }, uNight: { value: new THREE.Color('#202321') }, uSize: { value: new THREE.Vector2() } }), []);
  const { viewport, size } = useThree();
  useFrame(() => { if (material.current) { material.current.uniforms.uDark.value = motion.current.dark; material.current.uniforms.uSize.value.set(size.width, size.height); } });
  return <mesh name="journey-backdrop" position={[0, 0, -5]} scale={[viewport.width * 2, viewport.height * 2, 1]}>
    <planeGeometry args={[1, 1]}/><shaderMaterial ref={material} uniforms={uniforms} depthWrite={false} toneMapped={false}
      vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader={`varying vec2 vUv; uniform float uDark; uniform vec3 uLight; uniform vec3 uNight; uniform vec2 uSize;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){float grain=hash(floor(gl_FragCoord.xy));float dissolve=smoothstep(grain*0.12,0.88+grain*0.12,uDark);vec3 color=mix(uLight,uNight,dissolve)+(grain-0.5)*0.009;gl_FragColor=vec4(color,1.0);\n#include <colorspace_fragment>}`}/>
  </mesh>;
}

function BackgroundType({ motion }: { motion: JourneyRef }) {
  const { viewport } = useThree();
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '210px Antonio, sans-serif'; ctx.textAlign = 'right';
    ctx.strokeStyle = '#778173'; ctx.lineWidth = 1.1;
    ctx.strokeText('BEYOND', 1530, 295); ctx.strokeText('THE BOX.', 1530, 535);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => { if (material.current) material.current.opacity = Math.max(0, 1-motion.current.hero*2)*.3; });
  return <mesh position={[0,0,-2]} scale={[viewport.width*1.2,viewport.height*1.2,1]}>
    <planeGeometry args={[1,1]}/><meshBasicMaterial ref={material} map={texture} transparent depthWrite={false} toneMapped={false}/>
  </mesh>;
}

function IlluminatedMind({ motion }: { motion: JourneyRef }) {
  const { scene: source } = useLoader(GLTFLoader, '/models/chrome-bust.glb');
  const root = useRef<THREE.Group>(null);
  const { size, viewport } = useThree();
  const dissolve=useMemo(()=>({value:0}),[]);
  const appeared=useRef(false);
  const material = useMemo(() => {const result=new THREE.MeshPhysicalMaterial({ color: '#8398a0', roughness: .28, metalness: .64, clearcoat: .8, transparent: false, opacity: 1, depthWrite: true });applySculptureDissolve(result,dissolve);return result;}, [dissolve]);
  const model = useMemo(() => { const clone = source.clone(true); clone.traverse(child => { child.layers.set(2); if (child instanceof THREE.Mesh) child.material = material; }); return clone; }, [source, material]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_,delta) => {
    if (!root.current) return;
    const small = size.width < 760;
    const state=motion.current;
    if(state.head>.01)appeared.current=true;
    if(state.head<.01&&state.headDissolve<.01)appeared.current=false;
    dissolve.value=THREE.MathUtils.damp(dissolve.value,state.headDissolve,5,Math.min(delta,.1));
    if(dissolve.value>.999)dissolve.value=1;
    root.current.visible=appeared.current&&dissolve.value<1;
    const diagnostics=document.querySelector<HTMLElement>('.journey-canvas');
    if(diagnostics){diagnostics.dataset.sculptureDissolve=dissolve.value.toFixed(3);diagnostics.dataset.sculptureVisible=String(root.current.visible);}

    root.current.position.set((small ? 0 : -.24) * viewport.width, -.12 * viewport.height, .25);
    root.current.rotation.y = -.12;
    root.current.scale.setScalar(small ? .58 : .93);

  });
  return <group ref={root} name="illuminated-mind" visible={false}><primitive object={model}/></group>;
}

function SculptureLight({motion}: {motion: JourneyRef}) {
  const spill=useRef<THREE.PointLight>(null);
  const {viewport,size}=useThree();
  useEffect(()=>{spill.current?.layers.set(2);},[]);
  useFrame(()=>{
    const state=motion.current;
    const boxScale=state.scale*(size.width<760?.75:1.1);
    spill.current?.position.set(state.x*viewport.width,state.y*viewport.height-boxScale*.85,1.5);
    if(spill.current)spill.current.intensity=state.glow*state.head*10;
  });
  return <pointLight ref={spill} color="#eef5ff" intensity={0} distance={6} decay={2}/>;
}

function Studio({ motion, onReady }: { motion: JourneyRef; onReady: () => void }) {
  const { gl, scene, camera, size } = useThree();
  const frame = useRef(0);
  const effects = useMemo(() => {
    const renderTarget = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
    const composer = new EffectComposer(gl,renderTarget);
    const render = new RenderPass(scene, camera);
    const modelCamera: THREE.Camera = camera.clone(); modelCamera.layers.set(2);
    const modelPass = new RenderPass(scene, modelCamera); modelPass.clear=false; modelPass.clearDepth=true;
    const boxCamera: THREE.Camera = camera.clone(); boxCamera.layers.set(1);
    const boxPass = new RenderPass(scene, boxCamera); boxPass.clear=false; boxPass.clearDepth=true;
    const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .12, .25, 2.1);
    const output = new OutputPass();
    composer.addPass(render); composer.addPass(modelPass); composer.addPass(boxPass); composer.addPass(bloom); composer.addPass(output);
    return { composer, bloom, render, modelPass, output, boxCamera, modelCamera };
  }, [gl, scene, camera]);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, .04);
    scene.environment = target.texture;
    onReady();
    return () => { scene.environment = null; target.dispose(); room.dispose(); pmrem.dispose(); };
  }, [gl, scene, onReady]);
  useEffect(() => { effects.composer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio,1.5),2)); effects.composer.setSize(size.width, size.height); }, [effects, size]);
  useEffect(() => () => { effects.composer.dispose(); effects.bloom.dispose(); effects.output.dispose(); }, [effects]);
  useFrame((_, delta) => {
    effects.modelCamera.copy(camera); effects.modelCamera.layers.set(2);
    effects.boxCamera.copy(camera); effects.boxCamera.layers.set(1);
    scene.traverse(object => { if (object instanceof THREE.Light) object.layers.enable(1); if (object instanceof THREE.Light) object.layers.enable(2); });
    effects.bloom.enabled = motion.current.glow > .005;
    effects.bloom.strength = motion.current.glow * .12;
    effects.composer.render(delta);
    if (++frame.current % 12 === 0) {
      const element = document.querySelector<HTMLElement>('.journey-canvas');
      if (element) {
        element.dataset.modelLayer = 'above-liquid';
        element.dataset.open = motion.current.open.toFixed(3);
        element.dataset.glow = motion.current.glow.toFixed(3);
        element.dataset.progress = motion.current.progress.toFixed(3);
        element.dataset.boxX = motion.current.x.toFixed(3);
        element.dataset.head = motion.current.head.toFixed(3);
        element.dataset.dark = motion.current.dark.toFixed(3);
      }
    }
  }, 1);
  return null;
}

export default function JourneyScene({ motion, onReady, paused }: { motion: JourneyRef; onReady: () => void; paused: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  return <Canvas frameloop={visible && !paused ? 'always' : 'never'} dpr={[1.5, 2]} gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }} camera={{ position: [0, 0, 10], fov: 40, near: .1, far: 40 }} aria-hidden="true">
    <Backdrop motion={motion}/>
    <BackgroundType motion={motion}/>
    <ambientLight intensity={.5}/><directionalLight position={[-4, 5, 6]} intensity={1.8} color="#fff7e8"/><directionalLight position={[4, 1, 3]} intensity={.8} color="#e3eaff"/>

    <SilverFluid motion={motion} paused={paused}/>
    <SculptureLight motion={motion}/><Suspense fallback={null}><IlluminatedMind motion={motion}/></Suspense>
    <Studio motion={motion} onReady={onReady}/>
  </Canvas>;
}



function ForegroundEnvironment() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room,.04); scene.environment=environment.texture;
    camera.layers.set(1); scene.traverse(object=>{if(object instanceof THREE.Light)object.layers.enable(1);});
    return ()=>{environment.dispose();room.dispose();pmrem.dispose();};
  },[gl,scene,camera]);
  return null;
}
function SculptureComposite({motion}: {motion: JourneyRef}) {
  const {gl,scene,camera,size}=useThree();
  const target=useMemo(()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType}),[]);
  const sculpture=useMemo(()=>({texture:{value:target.texture},size:{value:new THREE.Vector2(1,1)}}),[target]);
  useEffect(()=>{
    const ratio=gl.getPixelRatio();target.setSize(Math.round(size.width*ratio),Math.round(size.height*ratio));
    sculpture.size.value.set(target.width,target.height);
  },[gl,size,target,sculpture]);
  useEffect(()=>()=>{target.dispose();document.querySelector<HTMLElement>('.box-foreground')?.style.removeProperty('filter');},[target]);
  useFrame(()=>{
    const glow=motion.current.glow*motion.current.head;
    scene.traverse(object=>{if(object instanceof THREE.Light)object.layers.enable(2);});
    const previous=gl.getRenderTarget();
    camera.layers.set(2);gl.setRenderTarget(target);gl.setClearColor(0x000000,0);gl.clear();
    if(glow>.001)gl.render(scene,camera);
    camera.layers.set(1);gl.setRenderTarget(previous);gl.clear();gl.render(scene,camera);
    const element=document.querySelector<HTMLElement>('.box-foreground');
    if(element){
      element.dataset.sculptureBlend=glow.toFixed(3);
      element.style.filter=glow>.001?`drop-shadow(0 0 ${20*glow}px rgba(235,245,255,${.8*glow})) drop-shadow(0 0 ${54*glow}px rgba(220,235,255,${.5*glow}))`:'none';
    }
  },1);
  return <><CardboardBox motion={motion} sculpture={sculpture}/><Suspense fallback={null}><IlluminatedMind motion={motion}/></Suspense></>;
}
export function ForegroundBox({ motion, paused }: { motion: JourneyRef; paused: boolean }) {
  const [visible,setVisible]=useState(true);
  useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  return <Canvas frameloop={visible&&!paused?'always':'never'} dpr={[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} camera={{position:[0,0,10],fov:40,near:.1,far:40}} aria-hidden="true">
    <ambientLight intensity={.5}/><directionalLight position={[-4,5,6]} intensity={1.8} color="#fff7e8"/><directionalLight position={[4,1,3]} intensity={.8} color="#e3eaff"/>
    <SculptureComposite motion={motion}/><ForegroundEnvironment/>
  </Canvas>;
}
