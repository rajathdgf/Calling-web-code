import * as THREE from 'three';

export class CameraManager {
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 220);
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3(0, 8.5, 12);
  private shake = 0;

  update(player: THREE.Object3D, speedFactor: number, dt: number): void {
    this.target.set(player.position.x * 0.34, player.position.y + 1.2, player.position.z - 4.8);
    this.desired.set(player.position.x * 0.28, 7.8 + speedFactor * 1.2, player.position.z + 12 - speedFactor * 1.4);
    const smooth = 1 - Math.exp(-dt * 5.8);
    this.camera.position.lerp(this.desired, smooth);
    this.camera.lookAt(this.target);
    this.camera.fov += ((58 + speedFactor * 8) - this.camera.fov) * smooth;
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.05, dt);
    }
    this.camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  punch(intensity = 0.18): void { this.shake = Math.max(this.shake, intensity); }
}
