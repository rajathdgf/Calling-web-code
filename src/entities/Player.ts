import * as THREE from 'three';
import { gsap } from 'gsap';
import type { PlayerStats } from '../types';

export class Player {
  readonly group = new THREE.Group();
  private barrel: THREE.Mesh;
  private base: THREE.Mesh;
  private muzzle: THREE.Mesh;
  aim = 0;

  constructor() {
    const blue = new THREE.MeshStandardMaterial({ color: 0x25b7ff, roughness: 0.32, metalness: 0.22 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x16315f, roughness: 0.45, metalness: 0.12 });
    this.base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.62, 24), dark);
    this.base.position.y = 0.32;
    this.barrel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 2.7), blue);
    this.barrel.position.set(0, 0.82, -1.1);
    this.muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.38, 18), blue);
    this.muzzle.rotation.x = Math.PI * 0.5;
    this.muzzle.position.set(0, 0.82, -2.55);
    this.group.add(this.base, this.barrel, this.muzzle);
    this.reset();
  }

  reset(): void {
    this.group.position.set(0, 0, 5.4);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(1);
    this.aim = 0;
  }

  update(dt: number, targetAim: number, stats: PlayerStats): void {
    this.aim += (targetAim - this.aim) * (1 - Math.exp(-dt * 12));
    this.group.rotation.y = -this.aim * 0.44;
    this.base.rotation.y += dt * 0.7;
    const recoil = 1 + Math.sin(performance.now() * 0.016 * stats.fireRate) * 0.015;
    this.barrel.scale.z = recoil;
  }

  muzzleWorld(): THREE.Vector3 {
    const out = new THREE.Vector3(0, 0.82, -2.7);
    return this.group.localToWorld(out);
  }

  direction(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.aim * 0.52), 0, -Math.cos(this.aim * 0.52)).normalize();
  }

  firePunch(): void {
    gsap.fromTo(this.barrel.position, { z: -0.9 }, { z: -1.1, duration: 0.11, ease: 'power2.out' });
    gsap.fromTo(this.muzzle.scale, { x: 1.35, y: 1.35, z: 1.35 }, { x: 1, y: 1, z: 1, duration: 0.14, ease: 'power2.out' });
  }

  applyStats(stats: PlayerStats): void {
    gsap.fromTo(this.group.scale, { x: 1.08, y: 0.92, z: 1.08 }, { x: 1, y: 1, z: 1, duration: 0.28, ease: 'elastic.out(1, .5)' });
    (this.barrel.material as THREE.MeshStandardMaterial).emissive.setHex(stats.crowd > 2 ? 0x14395a : 0x031225);
  }

  setColor(color: number): void { (this.barrel.material as THREE.MeshStandardMaterial).color.setHex(color); (this.muzzle.material as THREE.MeshStandardMaterial).color.setHex(color); }
}
