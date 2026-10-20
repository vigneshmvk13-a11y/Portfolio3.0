/**
 * Wheel state: one unbounded `position` number, sprung with Motion and rendered each frame.
 * Everything else (inputs, TOC, hash, sheet, video, intro) talks to this.
 *
 * Events on the stage element:
 *   wheel:start  { index, slug, via }        motion began (spring, scroll follow, drag, intro)
 *   wheel:change { index, slug, from, via }  rounded index changed (also mid-animation)
 *   wheel:settle { index, slug, via }        motion finished at an index
 */
import {
  animateValue,
  type AnimationPlaybackControlsWithThen as Controls,
  type ValueAnimationOptions,
} from 'motion';
import { spring, wheel } from '../../lib/motion';
import { prefersReducedMotion } from '../../lib/reduced-motion';
import { activeIndex, shortestDelta } from './geometry';
import { WheelRenderer } from './render';

export type Via = 'wheel' | 'drag' | 'key' | 'toc' | 'click' | 'hash' | 'intro' | 'init';

export interface WheelDetail {
  index: number;
  slug: string;
  from?: number;
  via: Via;
}

export class WheelController {
  readonly stage: HTMLElement;
  readonly count: number;
  readonly slugs: string[];
  private renderer: WheelRenderer;
  private animation: Controls | null = null;
  /** Integer position the running animation is heading to. */
  private target: number | null = null;
  /** Where scroll input has taken the wheel; the wheel chases it (null when not following). */
  private followTarget: number | null = null;
  private followFrame = 0;
  private current = 0;
  /** Measured speed (positions/s) and when position was last set, so retargets keep their momentum. */
  private speed = 0;
  private lastSetAt = 0;
  private lastIndex = 0;
  /** Disabled while the drawer is open or the intro runs. */
  enabled = true;

  constructor(stage: HTMLElement) {
    this.stage = stage;
    const cards = [...stage.querySelectorAll<HTMLElement>('[data-wheel-card]')];
    this.count = cards.length;
    this.slugs = cards.map((card) => card.dataset.slug ?? '');
    this.renderer = new WheelRenderer(stage, cards);
  }

  get position(): number {
    return this.current;
  }

  get index(): number {
    return activeIndex(this.current, this.count);
  }

  get moving(): boolean {
    return this.animation !== null || this.following;
  }

  get following(): boolean {
    return this.followTarget !== null;
  }

  /** Integer position the wheel is at or heading to. */
  get destination(): number {
    return Math.round(this.target ?? this.current);
  }

  /** Current speed, positions/s (0 at rest). Carried into the next spring when motion is retargeted. */
  get velocity(): number {
    return this.moving ? this.speed : 0;
  }

  /** Place the wheel without animation (load, hash restore, reduced motion, intro skip). */
  jumpTo(index: number, via: Via = 'init'): void {
    this.stop();
    this.set(index, via);
    this.settle(via);
  }

  /** Step by ±n cards (wraps). */
  step(delta: number, via: Via): void {
    if (delta === 0) return;
    const base = this.animation ? Math.round(this.target ?? this.current) : Math.round(this.current);
    this.springTo(base + delta, via);
  }

  /** Rotate the shortest way to `index`. */
  goTo(index: number, via: Via): void {
    const base = Math.round(this.target ?? this.current);
    this.springTo(base + shortestDelta(activeIndex(base, this.count), index, this.count), via);
  }

  /** Direct manipulation (drag): follow the input exactly. */
  setPosition(position: number, via: Via): void {
    this.stop();
    this.begin(via);
    this.set(position, via);
  }

  /**
   * Scroll-linked movement: chase `target` with exponential smoothing (time constant `wheel.follow`),
   * so mouse-wheel notches glide instead of jumping. Doesn't settle; the input snaps when it goes quiet.
   */
  follow(target: number, via: Via): void {
    if (this.animation) this.stop();
    this.begin(via);
    this.followTarget = target;
    if (this.followFrame) return;
    let last: number | null = null;
    const tick = (now: number) => {
      const goal = this.followTarget;
      if (goal === null) return;
      const dt = last === null ? 1 / 60 : Math.max(0.001, (now - last) / 1000);
      last = now;
      const previous = this.current;
      const next = previous + (goal - previous) * (1 - Math.exp(-dt / wheel.follow));
      const arrived = Math.abs(goal - next) < 0.0005;
      this.set(arrived ? goal : next, via);
      this.followFrame = arrived ? 0 : requestAnimationFrame(tick);
    };
    this.followFrame = requestAnimationFrame(tick);
  }

  /**
   * Spring to `target` (an integer position). It starts at the wheel's current speed unless given a
   * release velocity (positions/s), so retargeting mid-motion (rapid notches, a key during a snap) never
   * stalls the wheel and restarts it.
   */
  springTo(target: number, via: Via, velocity = this.velocity): void {
    this.stop();
    this.target = target;
    if (prefersReducedMotion()) {
      this.set(target, via);
      this.settle(via);
      return;
    }
    this.begin(via);
    const controls = animateValue<number>({
      keyframes: [this.current, target],
      ...spring.wheel,
      velocity,
      onUpdate: (value) => this.set(value, via),
    });
    this.track(controls, target, via);
  }

  /**
   * Keyframed animation of the position (the intro spin), resolved when finished.
   * Keyframes run on from the current position; the last one is where the wheel settles.
   */
  animatePosition(
    keyframes: number[],
    options: Omit<ValueAnimationOptions<number>, 'keyframes' | 'onUpdate'>,
    via: Via = 'intro',
  ): Controls {
    this.stop();
    const to = keyframes[keyframes.length - 1];
    this.target = to;
    this.begin(via);
    const controls = animateValue<number>({
      ...options,
      keyframes: [this.current, ...keyframes],
      onUpdate: (value) => this.set(value, via),
    });
    this.track(controls, to, via);
    return controls;
  }

  /** Halt any motion where it is. The caller then places the wheel (jumpTo, springTo…), which settles it. */
  stop(): void {
    if (this.followFrame) cancelAnimationFrame(this.followFrame);
    this.followFrame = 0;
    this.followTarget = null;
    if (!this.animation) return;
    const running = this.animation;
    this.animation = null;
    running.stop();
  }

  /** Re-measure after resize and redraw at the current position. */
  refresh(): void {
    this.renderer.measure();
    this.renderer.render(this.current);
  }

  /** Finger travel for one step, px. */
  get stepPx(): number {
    return this.renderer.stepPx;
  }

  private track(controls: Controls, to: number, via: Via): void {
    this.animation = controls;
    controls.then(() => {
      if (this.animation !== controls) return;
      this.animation = null;
      this.set(to, via);
      this.settle(via);
    });
  }

  /** Marks the stage as moving and announces it once per movement (covers pause). */
  private begin(via: Via): void {
    if ('moving' in this.stage.dataset) return;
    this.stage.dataset.moving = '';
    this.emit('wheel:start', { index: this.index, slug: this.slugs[this.index], via });
  }

  private set(position: number, via: Via): void {
    const now = performance.now();
    const dt = (now - this.lastSetAt) / 1000;
    // Same-frame repeats keep the last reading; a long gap means the wheel was at rest.
    if (dt > 0.001) this.speed = dt < 0.1 ? (position - this.current) / dt : 0;
    this.lastSetAt = now;
    this.current = position;
    this.renderer.render(position);
    const index = this.index;
    if (index !== this.lastIndex) {
      const from = this.lastIndex;
      this.lastIndex = index;
      this.renderer.setActive(index);
      this.emit('wheel:change', { index, slug: this.slugs[index], from, via });
    }
  }

  private settle(via: Via): void {
    this.target = null;
    this.speed = 0;
    delete this.stage.dataset.moving;
    // Keep the number small so long sessions don't accumulate float error.
    if (Math.abs(this.current) > this.count * 8) {
      this.current = this.index;
      this.renderer.render(this.current);
    }
    this.emit('wheel:settle', { index: this.index, slug: this.slugs[this.index], via });
  }

  private emit(type: string, detail: WheelDetail): void {
    this.stage.dispatchEvent(new CustomEvent<WheelDetail>(type, { detail, bubbles: true }));
  }
}
