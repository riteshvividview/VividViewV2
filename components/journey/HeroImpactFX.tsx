'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { JourneyRef } from './types';
import { BOX_HALF, IMPACT_EVENT, LAND_TILT, boxScaleFactor, landY, type ImpactDetail } from './heroIntro';

/** The dust clip (H.264 MP4: plays and seeks reliably everywhere; an earlier VP9 WebM stalled on seek in Chrome). */
export const DUST_CLIP = '/media/dust-impact.mp4';
const dustSource = () => DUST_CLIP;

const DUST_VERTEX = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
// The clip is white dust on black: luminance becomes coverage, tinted to read as dust on the cream page.
const DUST_FRAGMENT = `varying vec2 vUv;
uniform sampler2D uMap; uniform vec3 uThin; uniform vec3 uDense; uniform float uOpacity; uniform float uFront; uniform float uFlip;
void main(){
  vec2 uv=vec2(mix(vUv.x,1.0-vUv.x,uFlip),vUv.y);
  float l=texture2D(uMap,uv).r;
  float a=smoothstep(.09,.7,l);                                 // black point above the clip's faint ground haze
  a*=mix(1.0,(1.0-smoothstep(.03,.2,vUv.y))*.6,uFront);       // front layer: only a light, ground-hugging skirt
  a*=smoothstep(0.0,.14,vUv.x)*smoothstep(1.0,.86,vUv.x)*smoothstep(1.0,.82,vUv.y)*smoothstep(0.0,.03,vUv.y); // feathered frame + soft base (frame bottom = the clip's floor line)
  gl_FragColor=vec4(mix(uThin,uDense,smoothstep(.2,.9,l)),a*uOpacity);
  #include <colorspace_fragment>
}`;
const SHADOW_FRAGMENT = `varying vec2 vUv; uniform float uOpacity;
void main(){
  float d=length((vUv-.5)*2.0);
  float a=1.0-smoothstep(0.0,1.0,d); a*=a;
  gl_FragColor=vec4(vec3(.11,.11,.1),a*uOpacity);
  #include <colorspace_fragment>
}`;

const CAMERA_Z = 10; // matches the foreground canvas camera

/**
 * Where the landed box meets the ground. The box is tipped forward by LAND_TILT, so its lowest edge is the
 * front-bottom edge, nearer the camera than the box centre. `behind` rescales something at the centre depth
 * so it projects onto the same screen position as at the contact depth.
 */
function landing(small: boolean, scale: number, viewportHeight: number, boxZ: number) {
  const half = BOX_HALF * scale;
  const ground = landY(small) * viewportHeight - half * (Math.cos(LAND_TILT) + Math.sin(LAND_TILT));
  const contactZ = boxZ + half * (Math.cos(LAND_TILT) - Math.sin(LAND_TILT));
  return { ground, contactZ, behind: (CAMERA_Z - boxZ) / (CAMERA_Z - contactZ) };
}

type Emitter = { video: HTMLVideoElement; texture: THREE.VideoTexture; back: THREE.Mesh; front: THREE.Mesh; uniforms: Record<string, THREE.IUniform>; active: boolean; strength: number };

function makeEmitter(flip: number): Emitter {
  // The source is attached later from an in-memory Blob (see HeroImpactFX), so seeking to frame 0 at impact is instant.
  const video = document.createElement('video');
  Object.assign(video, { muted: true, playsInline: true, preload: 'auto', loop: false });
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  const texture = new THREE.VideoTexture(video);
  texture.generateMipmaps = false; texture.minFilter = texture.magFilter = THREE.LinearFilter;
  const uniforms = { uMap: { value: texture }, uThin: { value: new THREE.Color('#bdb7aa') }, uDense: { value: new THREE.Color('#948b7b') }, uOpacity: { value: 0 }, uFront: { value: 0 }, uFlip: { value: flip } };
  const material = (front: boolean) => new THREE.ShaderMaterial({ uniforms: { ...uniforms, uFront: { value: front ? 1 : 0 } }, vertexShader: DUST_VERTEX, fragmentShader: DUST_FRAGMENT, transparent: true, depthWrite: false, depthTest: !front, toneMapped: false }); // exact 2D colours, no ACES lift
  const geometry = new THREE.PlaneGeometry(1, 1);
  const back = new THREE.Mesh(geometry, material(false));
  const front = new THREE.Mesh(geometry, material(true));
  back.renderOrder = 5; front.renderOrder = 20;
  [back, front].forEach(mesh => { mesh.layers.set(1); mesh.visible = false; mesh.frustumCulled = false; });
  return { video, texture, back, front, uniforms, active: false, strength: 0 };
}

/**
 * Landing effects for the hero entrance, in the foreground (box) canvas:
 * a contact shadow on the landing ground, and the dust clip played at each impact,
 * once behind the box and once as a low skirt in front of its base.
 */
export default function HeroImpactFX({ motion }: { motion: JourneyRef }) {
  const { scene, size, viewport, gl, camera } = useThree();
  const fx = useMemo(() => {
    const emitters = [makeEmitter(0), makeEmitter(1)];
    // Depth-tested so the box hides the half of the shadow that sits behind its base.
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 0 } }, vertexShader: DUST_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false, depthTest: true, toneMapped: false }));
    shadow.renderOrder = -10; shadow.layers.set(1); shadow.visible = false; shadow.frustumCulled = false;
    return { emitters, shadow };
  }, []);

  useEffect(() => {
    const group = new THREE.Group();
    fx.emitters.forEach(emitter => group.add(emitter.back, emitter.front));
    group.add(fx.shadow);
    scene.add(group);
    // Compile the hidden effect shaders now, not on the first impact frame.
    const objects = [fx.shadow, ...fx.emitters.flatMap(emitter => [emitter.back, emitter.front])];
    const warm = requestAnimationFrame(() => { objects.forEach(o => { o.visible = true; }); gl.compile(scene, camera); objects.forEach(o => { o.visible = false; }); });
    return () => {
      cancelAnimationFrame(warm);
      scene.remove(group);
      fx.emitters.forEach(emitter => { emitter.video.pause(); emitter.video.removeAttribute('src'); emitter.video.load(); emitter.texture.dispose(); (emitter.back.material as THREE.Material).dispose(); (emitter.front.material as THREE.Material).dispose(); emitter.back.geometry.dispose(); });
      fx.shadow.geometry.dispose(); (fx.shadow.material as THREE.Material).dispose();
    };
  }, [fx, scene, gl, camera]);

  useEffect(() => {
    const onImpact = (event: Event) => {
      const { strength } = (event as CustomEvent<ImpactDetail>).detail;
      const box = scene.getObjectByName('travelling-sculptural-box');
      if (!box || strength < .3) return; // the last tiny settle gets no dust
      const emitter = strength >= .9 ? fx.emitters[0] : fx.emitters[1];
      const small = size.width < 760;
      const scale = motion.current.scale * boxScaleFactor(small);
      const { ground, contactZ, behind } = landing(small, scale, viewport.height, box.position.z);
      const width = BOX_HALF * 2 * scale * (strength >= .9 ? 3.1 : 2.1);
      const height = width * 534 / 1280; // clip is cropped at its floor line, so its bottom edge is the ground
      // The clip's impact sits ~58% across the frame; line that point up with the box.
      const flip = emitter.uniforms.uFlip.value as number;
      const x = box.position.x - (.58 - .5) * width * (flip ? -1 : 1);
      // Front skirt sits at the depth of the box's front-bottom edge; the back cloud sits at the box's centre depth
      // (so the box hides it), rescaled so its floor lands on the same screen line.
      emitter.front.scale.set(width, height, 1); emitter.front.position.set(x, ground + height * .485, contactZ + .02);
      emitter.back.scale.set(width * behind, height * behind, 1); emitter.back.position.set(x * behind, (ground + height * .485) * behind, box.position.z);
      emitter.back.visible = emitter.front.visible = true;
      emitter.strength = strength >= .9 ? .95 : .55;
      const { video } = emitter;
      const start = () => { emitter.active = true; video.currentTime = 0; video.playbackRate = Number(document.documentElement.dataset.introSpeed) || 1; video.play().catch(() => { emitter.active = false; }); };
      if (video.readyState >= 3) start();
      else {
        // Not buffered yet: start as soon as it can, but only if the dust would still read as part of the impact.
        const requested = performance.now();
        video.addEventListener('canplay', () => { if (performance.now() - requested < 350) start(); else [emitter.back, emitter.front].forEach(mesh => { mesh.visible = false; }); }, { once: true });
        video.load();
      }
    };
    window.addEventListener(IMPACT_EVENT, onImpact);
    return () => window.removeEventListener(IMPACT_EVENT, onImpact);
  }, [fx, scene, size, viewport, motion]);

  // Load the clip once into memory (the page loader already downloaded it, so this is a cache hit) and share it.
  useEffect(() => {
    let url = '', alive = true;
    fetch(dustSource()).then(response => response.blob()).then(blob => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      fx.emitters.forEach(emitter => {
        const { video } = emitter;
        video.src = url;
        // Warm the decoder before the box lands: play, then park on frame 0 (unless an impact already started it).
        video.addEventListener('canplay', () => { if (!emitter.active) video.play().then(() => { if (!emitter.active) { video.pause(); video.currentTime = 0; } }).catch(() => undefined); }, { once: true });
        video.load();
      });
    }).catch(() => undefined);
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [fx]);

  useFrame(() => {
    const state = motion.current;
    // Contact shadow: tight and dark as the box nears the ground, wide and faint while it is high.
    const box = scene.getObjectByName('travelling-sculptural-box');
    if (box && state.shadow > .001) {
      const small = size.width < 760;
      const scale = state.scale * boxScaleFactor(small);
      const centre = landY(small) * viewport.height;
      const { ground, contactZ } = landing(small, scale, viewport.height, box.position.z);
      const height = Math.max(0, box.position.y - centre) / viewport.height;
      const near = THREE.MathUtils.clamp(1 - height / .6, 0, 1);
      const width = BOX_HALF * 2 * scale * (1.05 + height * .9);
      fx.shadow.scale.set(width, width * .13, 1);
      // Just behind the contact edge: the box face hides its upper half, the lower half lies on the "floor".
      fx.shadow.position.set(box.position.x, ground, contactZ - .04);
      (fx.shadow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = state.shadow * near * near * .5;
      fx.shadow.visible = true;
    } else fx.shadow.visible = false;

    fx.emitters.forEach(emitter => {
      if (!emitter.active) return;
      const { video } = emitter;
      const duration = video.duration || 4.2;
      const t = video.currentTime;
      const opacity = emitter.strength * THREE.MathUtils.smoothstep(t, 0, .04) * (1 - THREE.MathUtils.smoothstep(t, duration - 1.5, duration - .05));
      [emitter.back, emitter.front].forEach(mesh => { (mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = opacity; });
      if (video.ended || t >= duration - .05) { emitter.active = false; emitter.back.visible = emitter.front.visible = false; video.pause(); }
    });
    const element = document.querySelector<HTMLElement>('.box-foreground');
    // Diagnostics for tests: emitter state, written only when it changes.
    const status = fx.emitters.map(e => `${e.active ? 'on' : 'off'}@${e.video.currentTime.toFixed(1)}/${e.video.readyState}`).join(' ');
    if (element && element.dataset.dust !== status) element.dataset.dust = status;
  });
  return null;
}
