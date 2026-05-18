declare namespace THREE {
  type Object3D = any; type Mesh = any; type Group = any; type Vector3 = any; type WebGLRenderer = any; type MeshStandardMaterial = any; type PerspectiveCamera = any; type InstancedMesh = any;
}
declare const THREE: any;
declare module 'three' { export = THREE; }
declare namespace CANNON { type World = any; }
declare const CANNON: any;
declare module 'cannon-es' { export = CANNON; }
declare module 'gsap' { export const gsap: any; }
