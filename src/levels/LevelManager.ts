import type { GateConfig, ObstacleConfig } from '../types';

export interface LevelLayout { gates: GateConfig[]; obstacles: ObstacleConfig[]; length: number; }

const COLORS = { speed: 0x55d6ff, power: 0xff5c8a, size: 0xa7ff55, multiplier: 0xffd15c } as const;

export class LevelManager {
  generate(level: number): LevelLayout {
    const length = 92 + Math.min(level, 12) * 8;
    const gates: GateConfig[] = [];
    const obstacles: ObstacleConfig[] = [];
    const types = ['speed', 'power', 'size', 'multiplier'] as const;
    for (let i = 0; i < 8 + Math.min(level, 6); i += 1) {
      const type = types[(i + level) % types.length];
      const amount = type === 'multiplier' ? 0.5 : 0.32 + level * 0.02;
      gates.push({ z: -12 - i * 9.5, x: ((i * 13 + level) % 3 - 1) * 2.1, type, amount, label: `${type === 'multiplier' ? 'x' : '+'}${amount.toFixed(1)} ${type}`, color: COLORS[type] });
    }
    for (let i = 0; i < 6 + Math.min(level, 9); i += 1) {
      obstacles.push({ z: -18 - i * 7.4 - (level % 3), x: (((i + 1) * 17 + level) % 3 - 1) * 2.15, width: 0.75 + (i % 2) * 0.35 });
    }
    return { gates, obstacles, length };
  }
}
