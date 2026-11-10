'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { JourneyRef } from './types';
import { LiquidVolume } from './fluid/LiquidVolume';
import { createLiquidEnvironment } from './fluid/createLiquidEnvironment';
import { applyGlassOptics } from './fluid/glassOptics';

export default function SilverFluid({ motion, paused = false }: { motion: JourneyRef; paused?: boolean }) {
  const { camera, viewport, size, gl } = useThree();
  const mobile = size.width < 760;
  const pointer = useRef(new THREE.Vector2(5, 5));
  const resources = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: '#f2f5f6', metalness: .16, roughness: .025,
      transmission: .88, thickness: .28, ior: 1.52,
      attenuationColor: '#e1e8ec', attenuationDistance: 8,
      clearcoat: 1, clearcoatRoughness: .02,
      iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [220, 620],
      envMapIntensity: 1.65, side: THREE.FrontSide,
    });
    const brightness={value:1};
    applyGlassOptics(material,brightness);
    return {
      material, brightness, volume: new LiquidVolume(mobile ? 56 : 72, material),
      ray: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.2),
      hit: new THREE.Vector3(), localPointer: new THREE.Vector2(4, 4),
      time: 0, scrollPhase: 0, accumulated: 0, hover: 0, steps: 0, updateMs: 0,
    };
  }, [mobile]);

  useEffect(() => {
    const environment = createLiquidEnvironment(gl);
    resources.material.envMap = environment.texture;
    resources.material.needsUpdate = true;
    return () => {
      if (resources.material.envMap === environment.texture) {
        resources.material.envMap = null;
        resources.material.needsUpdate = true;
      }
      environment.dispose();
    };
  }, [gl, resources.material]);
  useEffect(() => {
    const move = (event: PointerEvent) => pointer.current.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
    const leave = () => pointer.current.set(5, 5);
    const up = (event: PointerEvent) => { if (event.pointerType !== 'mouse') leave(); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', leave);
    window.addEventListener('blur', leave);
    document.addEventListener('pointerleave', leave);
    document.documentElement.dataset.fluidSolver = 'procedural-implicit-volume';
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', leave);
      window.removeEventListener('blur', leave);
      document.removeEventListener('pointerleave', leave);
      resources.volume.dispose();
      resources.material.dispose();
      delete document.documentElement.dataset.fluidSolver;
    };
  }, [resources]);

  useFrame((_, delta) => {
    const mesh = resources.volume.mesh;
    const state = motion.current;
    resources.brightness.value=1-.55*THREE.MathUtils.smoothstep(state.head,0,1);
    const journey = THREE.MathUtils.smoothstep(state.hero, .25, .85);
    const radius = viewport.height * (.59 - journey * .12);
    mesh.position.set(THREE.MathUtils.lerp(.56, state.liquidX * .65, journey) * viewport.width, state.liquidY * viewport.height * .45 * journey, -1.2);
    mesh.scale.setScalar(radius * 1.2);
    mesh.rotation.y = resources.time * .25;
    mesh.rotation.z = Math.sin(resources.time * .13) * .045;
    mesh.updateWorldMatrix(true, false);
    resources.ray.setFromCamera(pointer.current, camera);
    let active = false;
    if (pointer.current.x < 2 && resources.ray.ray.intersectPlane(resources.plane, resources.hit)) {
      mesh.worldToLocal(resources.hit);
      resources.hit.multiplyScalar(1.2);
      active = resources.hit.x ** 2 + resources.hit.y ** 2 < .65;
      if (active) resources.localPointer.lerp(new THREE.Vector2(resources.hit.x, resources.hit.y), 1 - Math.exp(-delta * 8));
    }
    if (paused) return;
    const dt = Math.min(delta, .1);
    resources.hover = THREE.MathUtils.damp(resources.hover, active ? 1 : 0, 7, dt);
    resources.time += dt * 2.1;
    resources.scrollPhase = THREE.MathUtils.damp(resources.scrollPhase, state.progress * 2.4 + state.hero * .3, 5, dt);
    resources.accumulated += dt;
    if (resources.accumulated >= 1 / 30) {
      const start = performance.now();
      resources.volume.update(resources.time, resources.localPointer, resources.hover, resources.scrollPhase);
      resources.updateMs = performance.now() - start;
      resources.accumulated %= 1 / 30;
      resources.steps++;
      if (resources.steps % 8 === 0) {
        const element = document.querySelector<HTMLElement>('.journey-canvas');
        if (element) {
          element.dataset.fluidBrightness=resources.brightness.value.toFixed(3);
          element.dataset.fluidHover = resources.hover.toFixed(3);
          element.dataset.fluidActive = String(active);
          element.dataset.fluidSurface = 'volumetric-shell';
          element.dataset.fluidScrollPhase = resources.scrollPhase.toFixed(3);
          element.dataset.fluidSpeed = '2.1';
          element.dataset.fluidTime = resources.time.toFixed(3);
          element.dataset.fluidTriangles = String(mesh.count / 3);
          element.dataset.fluidUpdateMs = resources.updateMs.toFixed(2);
        }
      }
    }
  });
  return <primitive object={resources.volume.mesh} />;
}





