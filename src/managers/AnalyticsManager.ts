export class AnalyticsManager {
  private started = performance.now();
  track(event: string, params: Record<string, unknown> = {}): void {
    window.dispatchEvent(new CustomEvent('analytics_event', { detail: { event, params, t: Math.round(performance.now() - this.started) } }));
  }
}
