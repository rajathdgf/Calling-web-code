import * as THREE from 'three';
import { gsap } from 'gsap';
import { PoolManager } from '../managers/PoolManager';

export class FXManager {
  readonly group = new THREE.Group();
  private particleGeometry = new THREE.SphereGeometry(0.08, 6, 6);
  private material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, emissive: 0x222222 });
  private pool = new PoolManager<THREE.Mesh>(() => new THREE.Mesh(this.particleGeometry, this.material.clone()), (m) => { m.visible = false; this.group.remove(m); }, 80);

  burst(position: THREE.Vector3, color = 0xffffff, count = 14): void {
    for (let i = 0; i < count; i += 1) {
      const p = this.pool.acquire();
      p.visible = true;
      p.position.copy(position);
      p.scale.setScalar(0.8 + Math.random() * 1.4);
      (p.material as THREE.MeshStandardMaterial).color.setHex(color);
      this.group.add(p);
      gsap.to(p.position, { x: position.x + (Math.random() - 0.5) * 3, y: position.y + Math.random() * 2.4, z: position.z + (Math.random() - 0.5) * 2, duration: 0.48, ease: 'power2.out' });
      gsap.to(p.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.52, ease: 'power2.in', onComplete: () => this.pool.release(p) });
    }
  }
}
