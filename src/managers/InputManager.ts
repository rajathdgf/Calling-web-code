export class InputManager {
  targetX = 0;
  private dragging = false;
  private startX = 0;
  private startLane = 0;

  constructor(private element: HTMLElement) {
    element.addEventListener('pointerdown', this.onDown, { passive: true });
    element.addEventListener('pointermove', this.onMove, { passive: true });
    element.addEventListener('pointerup', this.onUp, { passive: true });
    element.addEventListener('pointercancel', this.onUp, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'a') this.targetX -= 1.2;
      if (event.key.toLowerCase() === 'd') this.targetX += 1.2;
      this.targetX = Math.max(-3.2, Math.min(3.2, this.targetX));
    });
  }

  reset(): void { this.targetX = 0; }

  private onDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.startX = event.clientX;
    this.startLane = this.targetX;
    this.element.setPointerCapture(event.pointerId);
  };
  private onMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = (event.clientX - this.startX) / Math.max(220, window.innerWidth * 0.36);
    this.targetX = Math.max(-3.2, Math.min(3.2, this.startLane + dx * 4.6));
  };
  private onUp = (): void => { this.dragging = false; };
}
