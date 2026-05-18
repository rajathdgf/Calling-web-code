import type { GateConfig, ObstacleConfig } from '../types';

export interface LevelLayout {
  gates: GateConfig[];
  obstacles: ObstacleConfig[];
  length: number;
  baseHealth: number;
  enemyRate: number;
}

const GATE_COLORS = { multiply: 0x4de2ff, rapid: 0xa7ff55, giant: 0xff6ab7, bonus: 0xffd15c } as const;
const GATE_KINDS = ['multiply', 'rapid', 'giant', 'bonus'] as const;

export class LevelManager {
  generate(level: number): LevelLayout {
    const length = 48 + Math.min(level, 15) * 1.2;
    const gates: GateConfig[] = [];
    const obstacles: ObstacleConfig[] = [];
    for (let i = 0; i < 8; i += 1) {
      const kind = GATE_KINDS[(i + level) % GATE_KINDS.length];
      const z = -8 - i * 4.8;
      const x = (((i * 11 + level) % 3) - 1) * 2.15;
      const value = kind === 'multiply' ? 2 + ((i + level) % 2) : kind === 'rapid' ? 0.35 : kind === 'giant' ? 0.45 : 0.5;
      gates.push({ z, x, kind, value, label: kind === 'multiply' ? `x${value}` : kind === 'rapid' ? '+Fire Rate' : kind === 'giant' ? '+Giant Mob' : '+Coin Bonus', color: GATE_COLORS[kind] });
    }
    for (let i = 0; i < 5 + Math.min(level, 7); i += 1) {
      obstacles.push({ z: -11 - i * 5.6, x: (((i + 2) * 17 + level) % 3 - 1) * 2.2, width: 0.85 + (i % 2) * 0.35 });
    }
    return { gates, obstacles, length, baseHealth: 85 + level * 28, enemyRate: 0.9 + Math.min(level, 12) * 0.055 };
  }
}
