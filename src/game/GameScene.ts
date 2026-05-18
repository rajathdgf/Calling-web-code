import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { gsap } from 'gsap';
import { Player } from '../entities/Player';
import { FXManager } from '../effects/FXManager';
import { CameraManager } from '../managers/CameraManager';
import type { GateConfig, ObstacleConfig, PlayerStats } from '../types';
import type { LevelLayout } from '../levels/LevelManager';

interface GateRuntime { mesh: THREE.Group; config: GateConfig; used: boolean; }
interface ObstacleRuntime { mesh: THREE.Mesh; config: ObstacleConfig; used: boolean; }

export class GameScene {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly player = new Player();
  readonly fx = new FXManager();
  readonly cameraManager = new CameraManager();
  private gates: GateRuntime[] = [];
  private obstacles: ObstacleRuntime[] = [];
  private road = new THREE.Group();
  private finishZ = -100;
  private world?: any;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.scene.fog = new THREE.Fog(0x8adfff, 30, 135);
    this.scene.background = new THREE.Color(0x8adfff);
    this.setupLights();
    this.setupEnvironment();
    this.scene.add(this.player.group, this.fx.group);
  }

  async initPhysics(): Promise<void> {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6ca0ff, 2.9));
    const sun = new THREE.DirectionalLight(0xffffff, 2.15);
    sun.position.set(-4, 10, 7);
    this.scene.add(sun);
  }

  private setupEnvironment(): void {
    this.scene.add(this.road);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x4656d9, roughness: 0.48, metalness: 0.12 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.08 });
    for (let i = 0; i < 22; i += 1) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.22, 7.6), roadMat);
      tile.position.set(0, -0.16, -i * 7.55);
      this.road.add(tile);
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 4.4), railMat);
      const right = left.clone();
      left.position.set(-3.9, 0.08, -i * 7.55); right.position.set(3.9, 0.08, -i * 7.55);
      this.road.add(left, right);
    }
  }

  loadLevel(layout: LevelLayout): void {
    this.gates.forEach(({ mesh }) => this.scene.remove(mesh));
    this.obstacles.forEach(({ mesh }) => this.scene.remove(mesh));
    this.gates = []; this.obstacles = [];
    this.finishZ = -layout.length;
    this.player.reset();
    layout.gates.forEach((gate) => this.addGate(gate));
    layout.obstacles.forEach((obstacle) => this.addObstacle(obstacle));
    this.addFinish(layout.length);
  }

  private addGate(config: GateConfig): void {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.16, roughness: 0.25, metalness: 0.25 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 0.18), mat);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.55, 0.2), new THREE.MeshStandardMaterial({ color: 0x0e1d45, roughness: 0.4 }));
    hole.position.z = -0.02;
    group.add(frame, hole);
    group.position.set(config.x, 1.65, config.z);
    group.userData.label = config.label;
    this.scene.add(group);
    this.gates.push({ mesh: group, config, used: false });
  }

  private addObstacle(config: ObstacleConfig): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(config.width, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xff466c, roughness: 0.52, metalness: 0.05 }));
    mesh.position.set(config.x, 0.5, config.z);
    this.scene.add(mesh);
    this.obstacles.push({ mesh, config, used: false });
  }

  private addFinish(length: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd15c, roughness: 0.38, metalness: 0.2 });
    for (let i = -2; i <= 2; i += 1) {
      const vault = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat);
      vault.position.set(i * 1.25, 0.55, -length - 4 - Math.abs(i) * 0.25);
      this.scene.add(vault);
      this.obstacles.push({ mesh: vault, config: { x: vault.position.x, z: vault.position.z, width: 1.1 }, used: false });
    }
  }

  update(dt: number, targetX: number, stats: PlayerStats, onGate: (gate: GateConfig) => void, onHit: () => void, onFinish: () => void): void {
    this.world?.fixedStep();
    this.player.update(dt, targetX, stats);
    this.road.position.z = Math.floor(this.player.group.position.z / 7.55) * 7.55;
    this.gates.forEach((gate) => {
      if (!gate.used && Math.abs(gate.mesh.position.z - this.player.group.position.z) < 0.75 && Math.abs(gate.mesh.position.x - this.player.group.position.x) < 1.85) {
        gate.used = true;
        gsap.to(gate.mesh.scale, { x: 1.24, y: 1.24, z: 1.24, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
        this.fx.burst(gate.mesh.position, gate.config.color, 18);
        onGate(gate.config);
      }
    });
    this.obstacles.forEach((obstacle) => {
      if (!obstacle.used && Math.abs(obstacle.mesh.position.z - this.player.group.position.z) < 0.75 && Math.abs(obstacle.mesh.position.x - this.player.group.position.x) < (0.7 + obstacle.config.width)) {
        obstacle.used = true;
        this.fx.burst(obstacle.mesh.position, 0xff466c, 12);
        gsap.to(obstacle.mesh.rotation, { x: Math.random() * 2, z: Math.random() * 2, duration: 0.55, ease: 'power3.out' });
        gsap.to(obstacle.mesh.position, { y: 2.4, x: obstacle.mesh.position.x + (Math.random() - 0.5) * 3, duration: 0.55, ease: 'power2.out' });
        onHit();
      }
    });
    if (this.player.group.position.z < this.finishZ) onFinish();
    this.cameraManager.update(this.player.group, stats.speed / 4, dt);
    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.cameraManager.resize(width, height);
  }
}
