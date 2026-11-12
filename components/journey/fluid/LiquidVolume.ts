import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

function smoothMaximum(a: number, b: number, width: number) {
  const h = Math.max(width - Math.abs(a - b), 0) / width;
  return Math.max(a, b) + h * h * width * .25;
}

export class LiquidVolume {
  readonly mesh: MarchingCubes;
  private coordinates: Float32Array;
  private smoothing: Float32Array;
  private openings = Array.from({ length: 4 }, () => ({ x: 0, y: 0, radius: 0, stretch: 1, phase: 0 }));

  constructor(resolution: number, material: THREE.Material) {
    this.mesh = new MarchingCubes(resolution, material, false, false, 100000);
    this.smoothing = new Float32Array(resolution ** 3);
    this.mesh.isolation = 0;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'volumetric-liquid-shell';
    this.coordinates = Float32Array.from({ length: resolution }, (_, i) => (i - resolution / 2) / (resolution / 2) * 1.2);
    this.update(0, new THREE.Vector2(4, 4), 0);
  }

  update(time: number, pointer: THREE.Vector2, touch: number, scrollPhase = 0) {
    const t = time * 1.18 + scrollPhase * .7;
    const openness = .5 + .5 * Math.cos(time * .7 + scrollPhase * .25);
    const size = this.mesh.size;
    const field = this.mesh.field;
    const coordinates = this.coordinates;
    this.mesh.normal_cache.fill(0);
    for (let i = 0; i < this.openings.length; i++) {
      const opening = this.openings[i];
      const angle = i * 1.5708 + .38 + t * .18;
      const distance = .39 + Math.sin(t * .7 + i) * .075;
      opening.x = Math.cos(angle) * distance + Math.sin(t * .61 + i * 2) * .065;
      opening.y = Math.sin(angle) * distance + Math.cos(t * .57 + i * 3) * .055;
      opening.radius = Math.max(.12, .12 + .21 * openness + .035 * Math.sin(t * .65 + i * 1.7));
      opening.stretch = 1.1 + .25 * Math.sin(t * .53 + i);
      opening.phase = t * .8 + i * 1.9;
    }
    let index = 0;
    for (let iz = 0; iz < size; iz++) {
      const z = coordinates[iz];
      for (let iy = 0; iy < size; iy++) {
        const y = coordinates[iy];
        for (let ix = 0; ix < size; ix++, index++) {
          const x = coordinates[ix];
          const r = Math.sqrt(x * x + y * y + z * z);
          if (r > 1.06 || r < .36) { field[index] = -10; continue; }
          const front = Math.abs(z) / Math.max(r, .001);
          const px = x - pointer.x, py = y - pointer.y;
          const influence = Math.exp(-(px * px + py * py) * 10) * touch * front;
          const qx = x + py * influence * .13;
          const qy = y - px * influence * .13;
          const folds = Math.sin(qx * 4.7 + qy * 2.8 + Math.sin(z * 4 - t) * .9 + t)
            * Math.cos(qy * 3.8 - z * 3.4 - t * .7);
          const fold2 = Math.sin(qx * 7.2 - qy * 3.5 + z * 4.3 - t * .8);
          const shellRadius = .715 + front * (.115 * folds + .015 * fold2);
          const thickness = .095 + .012 * (.5 + .5 * Math.sin(qy * 5 + z * 4 + t));
          const shellOffset = r - shellRadius;
          let distance = Math.sqrt(shellOffset * shellOffset + .0004) - thickness;
          for (const opening of this.openings) {
            const hx = qx - opening.x + Math.sin(qy * 4 + opening.phase + z * 2) * .045;
            const hy = qy - opening.y + Math.sin(qx * 3.8 - opening.phase + z * 2.4) * .05;
            const hole = Math.sqrt(hx * hx + hy * hy * opening.stretch) - opening.radius;
            distance = smoothMaximum(distance, -hole, .15);
          }
          field[index] = -distance * 100;
        }
      }
    }
    for(let pass=0;pass<5;pass++){
    this.smoothing.set(field);
    const source=this.smoothing, layer=size*size;
    for(let z=1;z<size-1;z++)for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
      const i=z*layer+y*size+x;
      if(Math.abs(source[i])<15)field[i]=source[i]*.4+(source[i-1]+source[i+1]+source[i-size]+source[i+size]+source[i-layer]+source[i+layer])*.1;
    }
    }
    this.mesh.update();
  }

  dispose() { this.mesh.geometry.dispose(); }
}



