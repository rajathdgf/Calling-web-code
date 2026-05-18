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
interface MobRuntime { id: number; team: 'blue' | 'red'; position: THREE.Vector3; velocity: THREE.Vector3; scale: number; damage: number; alive: boolean; }

const MAX_MOBS = 560;
const LANE_LIMIT = 3.62;

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
  private assistedAim = 0;

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
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.22, 62), laneMat);
    platform.position.set(0, -0.14, -18);
    this.road.add(platform);
    [-4.55, 4.55].forEach((x) => {
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
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.35, 0.16), mat);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.24, 0.16), mat);
    left.position.set(-1.78, 1.15, 0); right.position.set(1.78, 1.15, 0); top.position.set(0, 2.28, 0);
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
    this.assistedAim += (this.getAimAssist(targetAim) - this.assistedAim) * (1 - Math.exp(-dt * 6));
    this.player.update(dt, this.assistedAim, stats);
    this.fireTimer -= dt;
    this.enemyTimer -= dt;
    if (this.fireTimer <= 0) {
      const interval = Math.max(0.045, 0.22 / stats.fireRate);
      this.fireTimer += interval;
      this.spawnBlueBurst(stats);
    }
    if (this.enemyTimer <= 0) {
      this.enemyTimer += Math.max(0.26, 1.15 / this.enemyRate);
      this.spawnEnemySquad();
    }
    this.updateMobs(dt, onGate, onHit, onFinish);
    this.updateInstances();
    const pressure = Math.min(1, this.mobs.filter((mob) => mob.team === 'blue').length / 130);
    this.cameraManager.updateArena(this.assistedAim, pressure, dt);
    this.renderer.render(this.scene, this.cameraManager.camera);
    return 1 - this.baseHealth / this.baseHealthMax;
  }

  private spawnBlueBurst(stats: PlayerStats): void {
    const count = Math.min(16, Math.max(4, Math.round(3 + stats.crowd * 2.4)));
    const origin = this.player.muzzleWorld();
    const direction = this.player.direction();
    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / 5);
      const col = (i % 5) - 2;
      const spread = col * 0.08 + (Math.random() - 0.5) * 0.045;
      const position = origin.clone().add(new THREE.Vector3(col * 0.16, 0, row * 0.18));
      const velocity = new THREE.Vector3(direction.x + spread, 0, direction.z).normalize().multiplyScalar(5.9 + stats.fireRate * 0.45);
      this.spawnMob('blue', position, velocity, 0.95 + Math.min(stats.crowd, 5) * 0.025, stats.damage);
    }
    this.player.firePunch();
  }

  private spawnEnemySquad(): void {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * 5.8 + (i - (count - 1) / 2) * 0.34;
      const z = this.finishLine + 4.3 - Math.random() * 0.7;
      this.spawnMob('red', new THREE.Vector3(Math.max(-LANE_LIMIT, Math.min(LANE_LIMIT, x)), 0.42, z), new THREE.Vector3((Math.random() - 0.5) * 0.18, 0, 2.15 + this.enemyRate * 0.18), 0.92, 1);
    }
  }

  private spawnMob(team: 'blue' | 'red', position: THREE.Vector3, velocity: THREE.Vector3, scale: number, damage: number): void {
    if (this.mobs.length >= MAX_MOBS - 5) return;
    this.mobs.push({ id: this.nextMobId++, team, position, velocity, scale, damage, alive: true });
  }

  private updateMobs(dt: number, onGate: (gate: GateConfig) => void, onHit: () => void, onFinish: (baseDamage: number) => void): void {
    for (const mob of this.mobs) {
      if (!mob.alive) continue;
      this.steerMob(mob, dt);
      mob.position.addScaledVector(mob.velocity, dt);
      mob.position.x = Math.max(-LANE_LIMIT, Math.min(LANE_LIMIT, mob.position.x));
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


  private getAimAssist(inputAim: number): number {
    const manualX = Math.sin(inputAim * 0.52) * 18;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestX = manualX;
    for (const gate of this.gates) {
      if (gate.mesh.position.z < -4 && gate.mesh.position.z > this.finishLine + 3) {
        const score = Math.abs(gate.mesh.position.x - manualX) + Math.abs(gate.mesh.position.z + 20) * 0.035;
        if (score < bestScore) { bestScore = score; bestX = gate.mesh.position.x; }
      }
    }
    for (const mob of this.mobs) {
      if (mob.team === 'red' && mob.alive) {
        const score = Math.abs(mob.position.x - manualX) + Math.abs(mob.position.z + 15) * 0.045;
        if (score < bestScore) { bestScore = score; bestX = mob.position.x; }
      }
    }
    const assistedX = manualX * 0.55 + bestX * 0.45;
    return Math.max(-1.25, Math.min(1.25, Math.asin(Math.max(-0.95, Math.min(0.95, assistedX / 18))) / 0.52));
  }

  private steerMob(mob: MobRuntime, dt: number): void {
    let targetX = mob.team === 'blue' ? 0 : this.player.group.position.x;
    if (mob.team === 'blue') {
      const gate = this.findNextGate(mob);
      const red = this.findNearestEnemy(mob);
      targetX = red && red.position.z - mob.position.z < 7 ? red.position.x : gate?.mesh.position.x ?? 0;
    } else {
      const blue = this.findNearestEnemy(mob);
      targetX = blue?.position.x ?? 0;
    }
    const steer = Math.max(-1.4, Math.min(1.4, targetX - mob.position.x));
    mob.velocity.x += steer * dt * (mob.team === 'blue' ? 3.2 : 2.2);
    mob.velocity.x *= Math.pow(0.18, dt);
    const forward = mob.team === 'blue' ? -1 : 1;
    const targetSpeed = mob.team === 'blue' ? 4.7 + mob.scale * 0.55 : 2.2 + this.enemyRate * 0.18;
    mob.velocity.z += (forward * targetSpeed - mob.velocity.z) * (1 - Math.exp(-dt * 4));
  }

  private findNextGate(mob: MobRuntime): GateRuntime | undefined {
    let best: GateRuntime | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const gate of this.gates) {
      const dz = mob.position.z - gate.mesh.position.z;
      if (dz > 0 && dz < bestDistance) { best = gate; bestDistance = dz; }
    }
    return best;
  }

  private findNearestEnemy(mob: MobRuntime): MobRuntime | undefined {
    let best: MobRuntime | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const other of this.mobs) {
      if (!other.alive || other.team === mob.team) continue;
      const distance = mob.position.distanceToSquared(other.position);
      if (distance < bestDistance) { best = other; bestDistance = distance; }
    }
    return best;
  }

  private checkGate(mob: MobRuntime, onGate: (gate: GateConfig) => void): void {
    for (const gate of this.gates) {
      if (gate.usedBy.has(mob.id)) continue;
      if (Math.abs(mob.position.z - gate.mesh.position.z) < 0.42 && Math.abs(mob.position.x - gate.mesh.position.x) < 1.82) {
        gate.usedBy.add(mob.id);
        if (gate.config.kind === 'multiply') {
          const clones = Math.min(8, Math.floor(gate.config.value) - 1);
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
      if (Math.abs(mob.position.z - block.mesh.position.z) < 0.78 && Math.abs(mob.position.x - block.mesh.position.x) < block.config.width * 0.82) {
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
        if (b.position.distanceToSquared(r.position) < 0.42) {
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
