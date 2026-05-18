export type RunState = 'landing' | 'loading' | 'menu' | 'running' | 'finish' | 'ended';

export interface PlayerStats {
  fireRate: number;
  damage: number;
  crowd: number;
  income: number;
}

export interface SaveData {
  coins: number;
  level: number;
  upgrades: PlayerStats;
  skins: string[];
  selectedSkin: string;
  sound: boolean;
}

export type GateKind = 'multiply' | 'rapid' | 'giant' | 'bonus';

export interface GateConfig {
  z: number;
  x: number;
  kind: GateKind;
  value: number;
  label: string;
  color: number;
}

export interface ObstacleConfig {
  z: number;
  x: number;
  width: number;
}
