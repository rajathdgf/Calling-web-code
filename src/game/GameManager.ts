import { gsap } from 'gsap';
import { Store } from '../core/Store';
import { AudioManager } from '../audio/AudioManager';
import { GameScene } from './GameScene';
import { InputManager } from '../managers/InputManager';
import { LevelManager } from '../levels/LevelManager';
import { SaveManager } from '../managers/SaveManager';
import { UIManager } from '../ui/UIManager';
import { AdsManager } from '../managers/AdsManager';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import type { GateConfig, PlayerStats, RunState } from '../types';

interface AppState { runState: RunState; stats: PlayerStats; progress: number; }

export class GameManager {
  private save = new SaveManager();
  private ui = new UIManager();
  private audio = new AudioManager();
  private levels = new LevelManager();
  private ads = new AdsManager();
  private analytics = new AnalyticsManager();
  private input: InputManager;
  private scene: GameScene;
  private store = new Store<AppState>({ runState: 'landing', stats: { speed: 1, power: 1, size: 1, multiplier: 1 }, progress: 0 });
  private last = performance.now();
  private running = false;
  private ending = false;
  private earned = 0;
  private levelLength = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new GameScene(canvas);
    this.input = new InputManager(canvas);
    this.bindUI();
    this.store.subscribe((state) => { this.ui.syncStats(state.stats); this.ui.setProgress(state.progress); });
  }

  async boot(): Promise<void> {
    const save = this.save.load();
    this.audio.init(save.sound);
    this.ui.syncSave(save);
    this.ui.renderUpgrades(save, (key) => this.buyUpgrade(key));
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
    this.ui.show('landing');
    requestAnimationFrame((t) => this.loop(t));
  }

  private async load(): Promise<void> {
    this.ui.show('loading');
    for (let i = 1; i <= 5; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 90));
      this.ui.setLoading(i / 5);
    }
    await this.scene.initPhysics();
    this.ui.show('menu');
  }

  private bindUI(): void {
    document.getElementById('landing-play')!.onclick = () => { this.audio.play('ui'); void this.load(); };
    document.getElementById('play-btn')!.onclick = () => { this.audio.play('ui'); this.startLevel(); };
    document.getElementById('next-btn')!.onclick = () => { this.audio.play('ui'); this.nextLevel(); };
    document.getElementById('double-btn')!.onclick = async () => { if (await this.ads.rewarded()) this.doubleReward(); };
    document.getElementById('upgrade-open-btn')!.onclick = () => { this.audio.play('ui'); this.ui.overlay('upgrade-modal', true); };
    document.getElementById('close-upgrades')!.onclick = () => { this.audio.play('ui'); this.ui.overlay('upgrade-modal', false); };
    document.getElementById('settings-btn')!.onclick = () => {
      this.save.data.sound = !this.save.data.sound; this.save.save(); this.audio.init(this.save.data.sound); this.audio.play('ui');
    };
    document.getElementById('skin-btn')!.onclick = () => { this.audio.play('ui'); this.ui.toast('New skins unlock soon', '#ffdd72'); };
  }

  private startLevel(): void {
    const layout = this.levels.generate(this.save.data.level);
    this.levelLength = layout.length;
    this.scene.loadLevel(layout);
    this.input.reset();
    this.earned = 0;
    this.ending = false;
    this.running = true;
    this.store.set({ runState: 'running', progress: 0, stats: { ...this.save.data.upgrades } });
    this.ui.show('hud');
    this.analytics.track('level_start', { level: this.save.data.level });
  }

  private loop(time: number): void {
    const dt = Math.min(0.033, (time - this.last) / 1000);
    this.last = time;
    const state = this.store.get();
    if (this.running && state.runState === 'running') {
      this.scene.update(dt, this.input.targetX, state.stats, (gate) => this.applyGate(gate), () => this.hit(), () => this.finish());
      this.store.set({ progress: Math.min(1, Math.abs(this.scene.player.group.position.z) / this.levelLength) });
    } else {
      this.scene.cameraManager.update(this.scene.player.group, 0, dt);
      this.scene.renderer.render(this.scene.scene, this.scene.cameraManager.camera);
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  private applyGate(gate: GateConfig): void {
    const stats = { ...this.store.get().stats };
    stats[gate.type] += gate.amount;
    if (gate.type === 'multiplier') stats.multiplier = Math.min(stats.multiplier, 8);
    this.store.set({ stats });
    this.scene.player.setColor(gate.color);
    this.scene.player.applyStats(stats);
    this.scene.cameraManager.punch(0.08);
    this.audio.play('gate');
    this.ui.toast(gate.label, `#${gate.color.toString(16).padStart(6, '0')}`);
    this.analytics.track('gate_collect', { type: gate.type, amount: gate.amount });
  }

  private hit(): void {
    const stats = { ...this.store.get().stats, power: Math.max(1, this.store.get().stats.power - 0.2) };
    this.store.set({ stats });
    this.scene.cameraManager.punch(0.22);
    this.audio.play('hit');
    this.ui.toast('SMASH!', '#ff6b81');
  }

  private finish(): void {
    if (this.ending) return;
    this.ending = true;
    this.running = false;
    const stats = this.store.get().stats;
    this.earned = Math.floor((45 + this.save.data.level * 12 + stats.power * 18) * stats.multiplier);
    this.scene.fx.burst(this.scene.player.group.position, 0xffd15c, 38);
    this.scene.cameraManager.punch(0.55);
    this.audio.play('finish');
    this.save.addCoins(this.earned);
    this.save.data.level += 1;
    this.save.save();
    this.ui.syncSave(this.save.data);
    this.analytics.track('level_complete', { coins: this.earned, level: this.save.data.level - 1 });
    gsap.delayedCall(0.82, () => this.ui.showReward(this.earned));
  }

  private nextLevel(): void {
    this.ads.maybeInterstitial(this.save.data.level);
    this.ui.syncSave(this.save.data);
    this.ui.show('menu');
  }

  private doubleReward(): void {
    this.save.addCoins(this.earned);
    this.ui.syncSave(this.save.data);
    this.earned *= 2;
    this.ui.showReward(this.earned);
    this.audio.play('coin');
    this.analytics.track('rewarded_ad_complete', { reward: this.earned });
  }

  private buyUpgrade(key: keyof PlayerStats): void {
    const cost = Math.floor(90 + this.save.data.upgrades[key] * 75);
    if (!this.save.spendCoins(cost)) { this.ui.toast('Need more coins', '#ff7b88'); return; }
    this.save.data.upgrades[key] += key === 'multiplier' ? 0.2 : 0.25;
    this.save.save();
    this.audio.play('upgrade');
    this.ui.syncSave(this.save.data);
    this.ui.renderUpgrades(this.save.data, (nextKey) => this.buyUpgrade(nextKey));
    this.analytics.track('upgrade_buy', { key, level: this.save.data.upgrades[key] });
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 520 ? 1.75 : 2.25);
    this.scene.resize(window.innerWidth, window.innerHeight, dpr);
  }
}
