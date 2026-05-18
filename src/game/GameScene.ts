import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { gsap } from 'gsap';
import { Player } from '../entities/Player';
import { FXManager } from '../effects/FXManager';
import { CameraManager } from '../managers/CameraManager';
import type { GateConfig, ObstacleConfig, PlayerStats } from '../types';
import type { LevelLayout } from '../levels/LevelManager';

interface GateRuntime { mesh: THREE.Group; config: GateConfig; usedBy: Set<number>; }
interface BlockRuntime { mesh: THREE.Mesh; config: ObstacleConfig; hp: number; }
interface MobRuntime { id: number; team: 'blue' | 'red'; position: THREE.Vector3; velocity: THREE.Vector3; scale: number; damage: number; alive: boolean; gateMask: Set<GateRuntime>; }

const MAX_MOBS = 420;

export class GameScene {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly player = new Player();
  readonly fx = new FXManager();
  readonly cameraManager = new CameraManager();
  private gates: GateRuntime[] = [];
  private blocks: BlockRuntime[] = [];
  private mobs: MobRuntime[] = [];
  private nextMobId = 1;
  private road = new THREE.Group();
  private blueMesh: THREE.InstancedMesh;
  private redMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private world?: any;
  private fireTimer = 0;
  private enemyTimer = 0;
  private baseHealth = 100;
  private baseHealthMax = 100;
  private enemyRate = 1;
  private finishLine = -48;
  private enemyBase = new THREE.Group();
  private blueBase = new THREE.Group();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.scene.fog = new THREE.Fog(0x91dcff, 28, 120);
    this.scene.background = new THREE.Color(0x91dcff);
    const mobGeo = new THREE.CapsuleGeometry(0.16, 0.38, 4, 8);
    this.blueMesh = new THREE.InstancedMesh(mobGeo, new THREE.MeshStandardMaterial({ color: 0x19b9ff, roughness: 0.38, metalness: 0.08 }), MAX_MOBS);
    this.redMesh = new THREE.InstancedMesh(mobGeo, new THREE.MeshStandardMaterial({ color: 0xff4d66, roughness: 0.42, metalness: 0.04 }), MAX_MOBS);
    this.blueMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.redMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.setupLights();
    this.setupEnvironment();
    this.scene.add(this.player.group, this.fx.group, this.blueMesh, this.redMesh);
  }

  async initPhysics(): Promise<void> {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x77a7ff, 2.85));
    const sun = new THREE.DirectionalLight(0xffffff, 2.25);
    sun.position.set(-5, 12, 7);
    this.scene.add(sun);
  }

  private setupEnvironment(): void {
    this.scene.add(this.road, this.enemyBase, this.blueBase);
    const laneMat = new THREE.MeshStandardMaterial({ color: 0x5569ee, roughness: 0.52, metalness: 0.08 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.06 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 62), laneMat);
    platform.position.set(0, -0.14, -18);
    this.road.add(platform);
    [-4.25, 4.25].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 62), edgeMat);
      rail.position.set(x, 0.08, -18);
      this.road.add(rail);
    });
    for (let i = 0; i < 12; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 2.2), edgeMat);
      stripe.position.set(0, 0.02, 4 - i * 5);
      this.road.add(stripe);
    }
    this.buildBase(this.blueBase, 0x25b7ff, 6.8, 'player');
    this.buildBase(this.enemyBase, 0xff516e, -44.5, 'enemy');
  }

  private buildBase(group: THREE.Group, color: number, z: number, side: 'player' | 'enemy'): void {
    group.clear();
    group.position.set(0, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.12 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 2), mat);
    base.position.set(0, 0.48, 0);
    group.add(base);
    for (let x = -1.6; x <= 1.6; x += 1.6) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 1.9, 14), mat);
      tower.position.set(x, 1.22, side === 'enemy' ? -0.65 : 0.65);
      group.add(tower);
    }
  }

  loadLevel(layout: LevelLayout): void {
    this.gates.forEach(({ mesh }) => this.scene.remove(mesh));
    this.blocks.forEach(({ mesh }) => this.scene.remove(mesh));
    this.gates = []; this.blocks = []; this.mobs = [];
    this.blueMesh.count = 0; this.redMesh.count = 0;
    this.fireTimer = 0; this.enemyTimer = 0; this.nextMobId = 1;
    this.baseHealth = layout.baseHealth; this.baseHealthMax = layout.baseHealth; this.enemyRate = layout.enemyRate; this.finishLine = -layout.length;
    this.enemyBase.position.z = this.finishLine + 3.5;
    this.player.reset();
    layout.gates.forEach((gate) => this.addGate(gate));
    layout.obstacles.forEach((obstacle) => this.addBlock(obstacle));
  }

  private addGate(config: GateConfig): void {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.2, roughness: 0.25, metalness: 0.18 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.25, 0.16), mat);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.22, 0.16), mat);
    left.position.set(-1.18, 1.15, 0); right.position.set(1.18, 1.15, 0); top.position.set(0, 2.22, 0);
    group.add(left, right, top);
    group.position.set(config.x, 0, config.z);
    this.scene.add(group);
    this.gates.push({ mesh: group, config, usedBy: new Set<number>() });
  }

  private addBlock(config: ObstacleConfig): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(config.width, 1.15, 1.15), new THREE.MeshStandardMaterial({ color: 0x263766, roughness: 0.54, metalness: 0.08 }));
    mesh.position.set(config.x, 0.48, config.z);
    this.scene.add(mesh);
    this.blocks.push({ mesh, config, hp: 3 });
  }

  update(dt: number, targetAim: number, stats: PlayerStats, onGate: (gate: GateConfig) => void, onHit: () => void, onFinish: (baseDamage: number) => void): number {
    this.world?.fixedStep();
    this.player.update(dt, targetAim, stats);
    this.fireTimer -= dt;
    this.enemyTimer -= dt;
    if (this.fireTimer <= 0) {
      const interval = Math.max(0.045, 0.22 / stats.fireRate);
      this.fireTimer += interval;
      this.spawnBlueBurst(stats);
    }
    if (this.enemyTimer <= 0) {
      this.enemyTimer += Math.max(0.18, 1 / this.enemyRate);
      this.spawnMob('red', new THREE.Vector3((Math.random() - 0.5) * 5.2, 0.42, this.finishLine + 4.5), new THREE.Vector3((Math.random() - 0.5) * 0.35, 0, 3.2 + this.enemyRate * 0.25), 0.95, 1);
    }
    this.updateMobs(dt, onGate, onHit, onFinish);
    this.updateInstances();
    const pressure = Math.min(1, this.mobs.filter((mob) => mob.team === 'blue').length / 130);
    this.cameraManager.updateArena(this.player.aim, pressure, dt);
    this.renderer.render(this.scene, this.cameraManager.camera);
    return 1 - this.baseHealth / this.baseHealthMax;
  }

  private spawnBlueBurst(stats: PlayerStats): void {
    const count = Math.min(7, Math.max(1, Math.round(stats.crowd)));
    const origin = this.player.muzzleWorld();
    const direction = this.player.direction();
    for (let i = 0; i < count; i += 1) {
      const spread = (i - (count - 1) / 2) * 0.085 + (Math.random() - 0.5) * 0.035;
      const velocity = new THREE.Vector3(direction.x + spread, 0, direction.z).normalize().multiplyScalar(7.5 + stats.fireRate * 0.6);
      this.spawnMob('blue', origin.clone().add(new THREE.Vector3(spread * 2, 0, 0)), velocity, 1, stats.damage);
    }
    this.player.firePunch();
  }

  private spawnMob(team: 'blue' | 'red', position: THREE.Vector3, velocity: THREE.Vector3, scale: number, damage: number): void {
    if (this.mobs.length >= MAX_MOBS - 5) return;
    this.mobs.push({ id: this.nextMobId++, team, position, velocity, scale, damage, alive: true, gateMask: new Set<GateRuntime>() });
  }

  private updateMobs(dt: number, onGate: (gate: GateConfig) => void, onHit: () => void, onFinish: (baseDamage: number) => void): void {
    for (const mob of this.mobs) {
      if (!mob.alive) continue;
      mob.position.addScaledVector(mob.velocity, dt);
      mob.position.x = Math.max(-3.55, Math.min(3.55, mob.position.x));
      if (mob.team === 'blue') this.checkGate(mob, onGate);
      this.checkBlocks(mob, onHit);
      if (mob.team === 'blue' && mob.position.z < this.finishLine + 1.9) {
        mob.alive = false;
        const damage = mob.damage * mob.scale;
        this.baseHealth = Math.max(0, this.baseHealth - damage);
        this.fx.burst(mob.position, 0xffd15c, 8);
        onFinish(damage);
      }
      if (mob.team === 'red' && mob.position.z > 6.1) {
        mob.alive = false;
        onHit();
      }
    }
    this.resolveMobCombat(onHit);
    this.mobs = this.mobs.filter((mob) => mob.alive && mob.position.z > this.finishLine - 4 && mob.position.z < 8.5);
  }

  private checkGate(mob: MobRuntime, onGate: (gate: GateConfig) => void): void {
    for (const gate of this.gates) {
      if (gate.usedBy.has(mob.id)) continue;
      if (Math.abs(mob.position.z - gate.mesh.position.z) < 0.28 && Math.abs(mob.position.x - gate.mesh.position.x) < 1.22) {
        gate.usedBy.add(mob.id);
        if (gate.config.kind === 'multiply') {
          const clones = Math.min(5, Math.floor(gate.config.value) - 1);
          for (let i = 0; i < clones; i += 1) this.spawnMob('blue', mob.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 0, 0.2)), mob.velocity.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, 0)), mob.scale, mob.damage);
        } else if (gate.config.kind === 'rapid') mob.velocity.multiplyScalar(1 + gate.config.value);
        else if (gate.config.kind === 'giant') { mob.scale += gate.config.value; mob.damage += gate.config.value; }
        else mob.damage += gate.config.value;
        gsap.fromTo(gate.mesh.scale, { x: 1.18, y: 1.18, z: 1.18 }, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(3)' });
        this.fx.burst(gate.mesh.position, gate.config.color, 10);
        onGate(gate.config);
      }
    }
  }

  private checkBlocks(mob: MobRuntime, onHit: () => void): void {
    for (const block of this.blocks) {
      if (block.hp <= 0) continue;
      if (Math.abs(mob.position.z - block.mesh.position.z) < 0.65 && Math.abs(mob.position.x - block.mesh.position.x) < block.config.width * 0.65) {
        block.hp -= mob.damage;
        mob.alive = false;
        this.fx.burst(mob.position, 0x263766, 6);
        onHit();
        if (block.hp <= 0) {
          gsap.to(block.mesh.position, { y: 1.8, x: block.mesh.position.x + (Math.random() - 0.5), duration: 0.45, ease: 'power2.out' });
          gsap.to(block.mesh.rotation, { x: Math.random() * 3, z: Math.random() * 3, duration: 0.45, ease: 'power2.out' });
        }
        return;
      }
    }
  }

  private resolveMobCombat(onHit: () => void): void {
    const blue = this.mobs.filter((mob) => mob.alive && mob.team === 'blue');
    const red = this.mobs.filter((mob) => mob.alive && mob.team === 'red');
    for (const b of blue) {
      for (const r of red) {
        if (!b.alive || !r.alive) continue;
        if (b.position.distanceToSquared(r.position) < 0.22) {
          b.alive = false; r.alive = false;
          this.fx.burst(b.position, 0xffffff, 5);
          onHit();
        }
      }
    }
  }

  private updateInstances(): void {
    let blueCount = 0; let redCount = 0;
    for (const mob of this.mobs) {
      this.dummy.position.copy(mob.position);
      this.dummy.scale.setScalar(mob.scale);
      this.dummy.rotation.y = Math.atan2(mob.velocity.x, -mob.velocity.z);
      this.dummy.updateMatrix();
      if (mob.team === 'blue' && blueCount < MAX_MOBS) this.blueMesh.setMatrixAt(blueCount++, this.dummy.matrix);
      if (mob.team === 'red' && redCount < MAX_MOBS) this.redMesh.setMatrixAt(redCount++, this.dummy.matrix);
    }
    this.blueMesh.count = blueCount; this.redMesh.count = redCount;
    this.blueMesh.instanceMatrix.needsUpdate = true; this.redMesh.instanceMatrix.needsUpdate = true;
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.cameraManager.resize(width, height);
  }
}
