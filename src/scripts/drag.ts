/**
 * Shared by the mobile sheets (sheet.ts: the footer; drawer.ts: About grown out of it). When a press
 * becomes a drag, how the release speed is measured, and how a 0–1 progress value settles afterwards.
 */
import { duration, ease, sheet as look, spring } from '../lib/motion';

/** Pointer travel before a press counts as a drag. */
export const DRAG_SLOP_PX = 6;
/** How far release speed carries the decision: projected = progress + velocity × this (seconds). */
export const FLING_S = 0.15;

/** A finger resting at least this long (ms) before lifting has let go from a hold: no flick. */
export const HOLD_MS = 60;

export const clamp01 =(n: number) => Math.min(1, Math.max(0, n));

/** A pointer event, or a touch point paired with its event's timeStamp. */
export interface DragPoint {
  timeStamp: number;
  clientY: number;
}

/** Recent pointer positions; the release speed is taken over the last 100ms. */
export class DragSamples {
  private samples: { t: number; y: number }[] = [];
  private liftedAt: number | null = null;

  reset(event: DragPoint): void {
    this.samples.length = 0;
    this.liftedAt = null;
    this.add(event);
  }

  add(event: DragPoint): void {
    this.samples.push({ t: event.timeStamp, y: event.clientY });
    if (this.samples.length > 6) this.samples.shift();
  }

  /**
   * The finger lifted at `timeStamp`. If it rested longer than HOLD_MS since its last move, it let go
   * from a hold, not a flick: velocity() is 0. (Only the time is used: some sources report no lift position.)
   */
  lift(timeStamp: number): void {
    this.liftedAt = timeStamp;
  }

  /** px per second, down positive. */
  velocity(): number {
    const last = this.samples[this.samples.length - 1];
    if (!last) return 0;
    if (this.liftedAt !== null && this.liftedAt - last.t > HOLD_MS) return 0;
    const first = this.samples.find((s) => last.t - s.t <= 100) ?? this.samples[0];
    return (last.y - first.y) / (Math.max(1, last.t - first.t) / 1000);
  }
}

/**
 * Motion options for settling a progress value from `from` to `to`. After a drag (`velocity`, progress
 * per second), a spring carries the release speed, taking as long as that speed needs to cover the rest
 * of the way (sheet.flickMin to spring.sheet's visualDuration), so a quick swipe finishes quickly and a
 * slow drag eases in. Otherwise (a tap, a button) an even ease-in-out over duration.slow.
 */
export function settleMotion(from: number, to: number, velocity?: number) {
  if (velocity === undefined) return { duration: duration.slow * 1000, ease: ease.inOut };
  const toward = (to - from) * velocity > 0 ? Math.abs(velocity) : 0;
  const needed = toward > 0 ? Math.abs(to - from) / toward : Infinity;
  const visualDuration = Math.min(spring.sheet.visualDuration, Math.max(look.flickMin, needed));
  return { ...spring.sheet, visualDuration, velocity };
}
