import type { SaveData } from '../types';

const SAVE_KEY = 'turbo-forge-run-save-v2';
const DEFAULT_SAVE: SaveData = {
  coins: 180,
  level: 1,
  upgrades: { fireRate: 1, damage: 1, crowd: 1, income: 1 },
  skins: ['cyan'],
  selectedSkin: 'cyan',
  sound: true,
};

export class SaveManager {
  data: SaveData = DEFAULT_SAVE;

  load(): SaveData {
    const raw = localStorage.getItem(SAVE_KEY);
    this.data = raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw) as SaveData } : { ...DEFAULT_SAVE, upgrades: { ...DEFAULT_SAVE.upgrades } };
    return this.data;
  }

  save(): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }

  addCoins(amount: number): void {
    this.data.coins += Math.max(0, Math.floor(amount));
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.save();
    return true;
  }
}
