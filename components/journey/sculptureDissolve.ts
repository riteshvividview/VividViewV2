import type {MeshPhysicalMaterial} from 'three';

export function applySculptureDissolve(material: MeshPhysicalMaterial, amount: {value:number}) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.uSculptureDissolve=amount;
    shader.vertexShader='varying vec3 vDissolvePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vDissolvePosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`
      uniform float uSculptureDissolve;
      varying vec3 vDissolvePosition;
      float dissolveHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float dissolveNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(dissolveHash(i),dissolveHash(i+vec3(1,0,0)),f.x),mix(dissolveHash(i+vec3(0,1,0)),dissolveHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(dissolveHash(i+vec3(0,0,1)),dissolveHash(i+vec3(1,0,1)),f.x),mix(dissolveHash(i+vec3(0,1,1)),dissolveHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
      #include <clipping_planes_fragment>
      float dissolveField=dissolveNoise(vDissolvePosition*5.)*.7+dissolveNoise(vDissolvePosition*11.)*.3;
      float dissolveThreshold=mix(-.05,1.05,uSculptureDissolve);
      if(dissolveField<dissolveThreshold)discard;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
      float dissolveRim=(1.-smoothstep(0.,.055,dissolveField-dissolveThreshold))*smoothstep(0.,.06,uSculptureDissolve);
      outgoingLight+=vec3(.58,.75,.85)*dissolveRim*.4;
      #include <opaque_fragment>
    `);
  };
}
