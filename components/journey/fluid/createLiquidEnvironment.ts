import * as THREE from 'three';

export function createLiquidEnvironment(renderer:THREE.WebGLRenderer){
  const scene=new THREE.Scene();
  scene.background=new THREE.Color().setRGB(.015,.022,.032);
  const panels:Array<[number,number,number,number,number,number,number,number]>=[
    [-2.4,3,3,3.2,4,5,5,5],
    [4,1,1,1.4,4.5,2.4,2.55,2.8],
    [-3,0,-2,1,5,1.8,2.1,2.5],
    [.5,-3,-1,3.5,.65,1.6,1.65,1.8],
    [.5,3,-3,2.5,.5,3,3,3],
  ];
  for(const [x,y,z,width,height,r,g,b] of panels){
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(r,g,b),side:THREE.DoubleSide});
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    panel.position.set(x,y,z);panel.lookAt(0,0,0);scene.add(panel);
  }
  const generator=new THREE.PMREMGenerator(renderer);
  const target=generator.fromScene(scene,.025,.1,30);
  scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}});
  generator.dispose();
  return target;
}
