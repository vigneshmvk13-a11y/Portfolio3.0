/**
 * Writes wheel poses to the DOM: transform, opacity, z-index and visibility per frame
 * (no layout reads), and inert/aria-hidden/data-offset only when the active card changes.
 */
import { poseAt, ringOffset, stepDistance, type CardPose, type Metrics } from './geometry';

export class WheelRenderer {
  private metrics: Metrics = { h: 0, gap: 0 };
  /** Last pose written per card, so a frame only touches what changed (hidden cards cost nothing). */
  private written: CardPose[] = [];

  constructor(
    private readonly stage: HTMLElement,
    private readonly cards: HTMLElement[],
  ) {
    this.measure();
    stage.dataset.live = '';
  }

  /** Card height and gap from layout (offsetHeight ignores transforms). Call on resize. */
  measure(): void {
    const h = this.cards[0]?.offsetHeight ?? 0;
    const gap = parseFloat(getComputedStyle(this.stage).getPropertyValue('--wheel-gap')) || 0;
    this.metrics = { h, gap };
  }

  /** Finger travel for one step, px. */
  get stepPx(): number {
    return Math.max(1, stepDistance(this.metrics));
  }

  render(position: number): void {
    const n = this.cards.length;
    for (let i = 0; i < n; i++) {
      const card = this.cards[i];
      const pose = poseAt(ringOffset(i, position, n), this.metrics);
      const last = this.written[i];
      if (last && !last.visible && !pose.visible) continue;
      const style = card.style;
      if (last?.visible !== pose.visible) style.visibility = pose.visible ? 'visible' : 'hidden';
      if (last?.zIndex !== pose.zIndex) style.zIndex = String(pose.zIndex);
      if (last?.transform !== pose.transform) style.transform = pose.transform;
      if (last?.opacity !== pose.opacity) style.opacity = String(pose.opacity);
      this.written[i] = pose;
    }
  }

  /**
   * Make hidden cards visible at opacity 0 so the browser builds their layers and paints them now,
   * not in the first frame a long motion (the intro spin) reveals them. The next render() restores them.
   */
  prewarm(): void {
    this.written.forEach((pose, i) => {
      if (pose.visible) return;
      this.cards[i].style.visibility = 'visible';
      this.written[i] = { ...pose, visible: true, opacity: 0 };
    });
  }

  /**
   * Only the active card is interactive; neighbours are decorative previews (rules.md).
   * If focus was on the outgoing card, it moves to the incoming one (inert would drop it to <body>).
   */
  setActive(index: number): void {
    const n = this.cards.length;
    const hadFocus = this.cards.some((card) => card.contains(document.activeElement));
    this.cards.forEach((card, i) => {
      const active = i === index;
      card.inert = !active;
      if (active) card.removeAttribute('aria-hidden');
      else card.setAttribute('aria-hidden', 'true');
      card.dataset.offset = String(Math.round(ringOffset(i, index, n)));
    });
    if (hadFocus) this.cards[index]?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  }
}
