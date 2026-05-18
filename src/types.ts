export type RunState = 'landing' | 'loading' | 'menu' | 'running' | 'finish' | 'ended';

export interface PlayerStats {
  speed: number;
  power: number;
  size: number;
  multiplier: number;
}

export interface SaveData {
  coins: number;
  level: number;
  upgrades: PlayerStats;
  skins: string[];
  selectedSkin: string;
  sound: boolean;
}

export interface GateConfig {
  z: number;
  x: number;
  type: keyof PlayerStats;
  amount: number;
  label: string;
  color: number;
}

export interface ObstacleConfig {
  z: number;
  x: number;
  width: number;
}
