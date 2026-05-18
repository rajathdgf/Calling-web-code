import * as THREE from 'three';

export class CameraManager {
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 180);
  private target = new THREE.Vector3(0, 0, -15);
  private desired = new THREE.Vector3(0, 15, 14);
  private shake = 0;

  update(player: THREE.Object3D, speedFactor: number, dt: number): void {
    this.updateArena(player.rotation.y / -0.44, speedFactor, dt);
  }

  updateArena(aim: number, pressure: number, dt: number): void {
    this.target.set(aim * 1.3, 0.3, -17 - pressure * 2.5);
    this.desired.set(aim * 1.4, 14.2 + pressure * 1.8, 13.6 - pressure * 1.8);
    const smooth = 1 - Math.exp(-dt * 5.5);
    this.camera.position.lerp(this.desired, smooth);
    this.camera.lookAt(this.target);
    this.camera.fov += ((55 + pressure * 5) - this.camera.fov) * smooth;
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.045, dt);
    }
    this.camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  punch(intensity = 0.18): void { this.shake = Math.max(this.shake, intensity); }
}
