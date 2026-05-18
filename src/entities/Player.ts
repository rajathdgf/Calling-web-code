import * as THREE from 'three';
import { gsap } from 'gsap';
import type { PlayerStats } from '../types';

export class Player {
  readonly group = new THREE.Group();
  private body: THREE.Mesh;
  private ring: THREE.Mesh;
  velocityZ = 8;

  constructor() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x56d7ff, roughness: 0.35, metalness: 0.28 });
    this.body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), mat);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 8, 24), new THREE.MeshStandardMaterial({ color: 0xff5cc8, emissive: 0x35122b, roughness: 0.22, metalness: 0.4 }));
    this.ring.rotation.x = Math.PI * 0.5;
    this.group.add(this.body, this.ring);
    this.reset();
  }

  reset(): void {
    this.group.position.set(0, 0.85, 0);
    this.group.scale.setScalar(1);
  }

  update(dt: number, targetX: number, stats: PlayerStats): void {
    const lateralSmooth = 1 - Math.exp(-dt * 12);
    this.group.position.x += (targetX - this.group.position.x) * lateralSmooth;
    this.group.position.z -= dt * (this.velocityZ + stats.speed * 2.1);
    this.body.rotation.x -= dt * 4.2;
    this.body.rotation.z += (targetX - this.group.position.x) * dt * 5;
    this.ring.rotation.z += dt * 5;
    const targetScale = Math.max(0.65, stats.size);
    this.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 1 - Math.exp(-dt * 7));
  }

  applyStats(stats: PlayerStats): void {
    gsap.fromTo(this.group.scale, { x: stats.size * 1.25, y: stats.size * 0.8, z: stats.size * 1.25 }, { x: stats.size, y: stats.size, z: stats.size, duration: 0.34, ease: 'elastic.out(1, .45)' });
  }

  setColor(color: number): void { (this.body.material as THREE.MeshStandardMaterial).color.setHex(color); }
}
