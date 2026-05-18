export class InputManager {
  targetX = 0;
  private dragging = false;

  constructor(private element: HTMLElement) {
    element.addEventListener('pointerdown', this.onPointer, { passive: true });
    element.addEventListener('pointermove', this.onPointer, { passive: true });
    element.addEventListener('pointerup', this.onUp, { passive: true });
    element.addEventListener('pointercancel', this.onUp, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'a') this.targetX -= 0.18;
      if (event.key.toLowerCase() === 'd') this.targetX += 0.18;
      this.targetX = Math.max(-1.25, Math.min(1.25, this.targetX));
    });
  }

  reset(): void { this.targetX = 0; }

  private onPointer = (event: PointerEvent): void => {
    if (event.type === 'pointerdown') {
      this.dragging = true;
      this.element.setPointerCapture(event.pointerId);
    }
    if (!this.dragging) return;
    const normalized = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    this.targetX = Math.max(-1.25, Math.min(1.25, normalized * 1.18));
  };

  private onUp = (): void => { this.dragging = false; };
}
