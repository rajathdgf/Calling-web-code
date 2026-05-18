export class AdsManager {
  private interstitialCounter = 0;
  async rewarded(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 420));
    window.dispatchEvent(new CustomEvent('ad_rewarded', { detail: { placement: 'double_coins' } }));
    return true;
  }
  maybeInterstitial(level: number): void {
    this.interstitialCounter += 1;
    if (this.interstitialCounter >= 3 || level % 3 === 0) {
      this.interstitialCounter = 0;
      window.dispatchEvent(new CustomEvent('ad_interstitial', { detail: { level } }));
    }
  }
}
