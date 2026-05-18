import { gsap } from 'gsap';
import type { PlayerStats, SaveData } from '../types';

export class UIManager {
  private screens = ['landing', 'loading', 'menu', 'hud', 'end-screen', 'upgrade-modal'].map((id) => document.getElementById(id)!);
  private loadingFill = document.getElementById('loading-fill')!;
  private progressFill = document.getElementById('progress-fill')!;
  private toastLayer = document.getElementById('toast-layer')!;

  show(id: string): void {
    this.screens.forEach((screen) => screen.classList.toggle('visible', screen.id === id));
    const active = document.getElementById(id);
    if (active) gsap.fromTo(active.children, { y: 18, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, stagger: 0.05, duration: 0.42, ease: 'back.out(1.6)' });
  }

  overlay(id: string, visible: boolean): void { document.getElementById(id)?.classList.toggle('visible', visible); }

  setLoading(value: number): void { gsap.to(this.loadingFill, { width: `${value * 100}%`, duration: 0.22, ease: 'power2.out' }); }

  syncSave(save: SaveData): void {
    document.querySelectorAll('[data-coins]').forEach((el) => { el.textContent = String(save.coins); });
    document.querySelectorAll('[data-level]').forEach((el) => { el.textContent = String(save.level); });
  }

  syncStats(stats: PlayerStats): void {
    document.getElementById('stat-fireRate')!.textContent = stats.fireRate.toFixed(1);
    document.getElementById('stat-damage')!.textContent = stats.damage.toFixed(1);
    document.getElementById('stat-crowd')!.textContent = stats.crowd.toFixed(1);
    document.getElementById('stat-income')!.textContent = stats.income.toFixed(1);
    gsap.fromTo('.live-stats', { scale: 1.04 }, { scale: 1, duration: 0.24, ease: 'back.out(3)' });
  }

  setProgress(value: number): void { this.progressFill.style.width = `${Math.max(0, Math.min(1, value)) * 100}%`; }

  toast(text: string, color = '#ffffff'): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    el.style.background = color;
    this.toastLayer.appendChild(el);
    gsap.fromTo(el, { y: 40, scale: 0.2, opacity: 0 }, { y: -40, scale: 1.2, opacity: 1, duration: 0.34, ease: 'back.out(2.5)' });
    gsap.to(el, { y: -130, opacity: 0, delay: 0.42, duration: 0.48, ease: 'power2.in', onComplete: () => el.remove() });
  }

  showReward(coins: number): void {
    document.getElementById('earned-coins')!.textContent = String(coins);
    this.show('end-screen');
    gsap.fromTo('.coin-burst', { scale: 0.3, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.55, ease: 'elastic.out(1, .45)' });
  }

  renderUpgrades(save: SaveData, buy: (key: keyof PlayerStats) => void): void {
    const list = document.getElementById('upgrade-list')!;
    list.innerHTML = '';
    (['fireRate', 'damage', 'crowd', 'income'] as (keyof PlayerStats)[]).forEach((key) => {
      const cost = Math.floor(90 + save.upgrades[key] * 75);
      const row = document.createElement('div');
      row.className = 'upgrade-row';
      row.innerHTML = `<div><strong>${key.toUpperCase()} Lv ${save.upgrades[key].toFixed(1)}</strong><small>Cost ${cost} ◈</small></div>`;
      const button = document.createElement('button');
      button.textContent = 'Upgrade';
      button.onclick = () => buy(key);
      row.appendChild(button);
      list.appendChild(row);
    });
  }
}
