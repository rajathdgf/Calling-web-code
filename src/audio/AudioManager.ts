export class AudioManager {
  private ctx?: AudioContext;
  enabled = true;

  init(enabled: boolean): void { this.enabled = enabled; }

  private context(): AudioContext | undefined {
    if (!this.enabled) return undefined;
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  play(name: 'gate' | 'coin' | 'hit' | 'finish' | 'ui' | 'upgrade'): void {
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const table = {
      gate: [520, 840, 0.12], coin: [900, 1280, 0.08], hit: [120, 70, 0.18],
      finish: [160, 620, 0.45], ui: [480, 680, 0.07], upgrade: [360, 960, 0.18],
    }[name];
    osc.frequency.setValueAtTime(table[0], now);
    osc.frequency.exponentialRampToValueAtTime(table[1], now + table[2]);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + table[2]);
    osc.type = name === 'hit' ? 'sawtooth' : 'triangle';
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + table[2] + 0.02);
  }
}
