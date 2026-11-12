import type {MeshPhysicalMaterial} from 'three';

export function applyGlassOptics(material:MeshPhysicalMaterial,brightness:{value:number}){
  material.onBeforeCompile=shader=>{
    shader.uniforms.uSectionBrightness=brightness;
    shader.fragmentShader='uniform float uSectionBrightness;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>', `
      #include <lights_physical_fragment>
      #ifdef USE_IRIDESCENCE
        vec3 filmNormal=inverseTransformDirection(normal,viewMatrix);
        float filmFlow=.5+.5*sin(dot(vWorldPosition,vec3(2.3,3.1,1.7))+filmNormal.x*4.+filmNormal.y*3.);
        material.iridescenceThickness=mix(220.,620.,filmFlow);
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
      float rimFacing=clamp(abs(dot(normal,normalize(vViewPosition))),0.,1.);
      float softRim=1.-smoothstep(.03,.38,rimFacing);
      outgoingLight=mix(outgoingLight,max(outgoingLight,vec3(.46,.47,.48)),softRim);
      outgoingLight*=uSectionBrightness;
      #include <opaque_fragment>
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',`
      #include <transmission_fragment>
      #if defined(USE_TRANSMISSION) && defined(ENVMAP_TYPE_CUBE_UV)
        vec3 liquidView=normalize(cameraPosition-vWorldPosition);
        vec3 liquidNormal=inverseTransformDirection(normal,viewMatrix);
        vec3 glassR=refract(-liquidView,liquidNormal,1./(material.ior-.045));
        vec3 glassG=refract(-liquidView,liquidNormal,1./material.ior);
        vec3 glassB=refract(-liquidView,liquidNormal,1./(material.ior+.045));
        vec3 studioGlass=vec3(
          textureCubeUV(envMap,envMapRotation*glassR,.065).r,
          textureCubeUV(envMap,envMapRotation*glassG,.065).g,
          textureCubeUV(envMap,envMapRotation*glassB,.065).b
        );
        totalDiffuse=mix(totalDiffuse,max(studioGlass,vec3(.3))*vec3(.97,.985,1.)*.8,.72);
        float glassFacing=clamp(abs(dot(liquidNormal,liquidView)),0.,1.);
        float spectralPhase=glassFacing*8.+dot(liquidNormal,vec3(2.,1.5,1.))+dot(vWorldPosition,vec3(.6,.8,.4));
        vec3 spectralFilm=.5+.5*cos(spectralPhase+vec3(0.,2.094,4.188));
        float spectralRim=pow(1.-glassFacing,.7);
        totalSpecular+=spectralFilm*spectralRim*.55;

      #endif
    `);
  };
}
