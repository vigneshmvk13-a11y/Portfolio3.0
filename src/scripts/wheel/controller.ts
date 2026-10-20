/**
 * Wheel state: one unbounded `position` number, sprung with Motion and rendered each frame.
 * Everything else (inputs, TOC, hash, sheet, video, intro) talks to this.
 *
 * Events on the stage element:
 *   wheel:change { index, slug, from, via }  rounded index changed (also mid-animation)
 *   wheel:settle { index, slug, via }        motion finished at an index
 */
import { animateValue, type AnimationPlaybackControls, type ValueAnimationOptions } from 'motion';
import { spring } from '../../lib/motion';
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
  private animation: AnimationPlaybackControls | null = null;
  /** Integer position the running animation is heading to. */
  private target: number | null = null;
  private current = 0;
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
    return this.animation !== null;
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
    this.set(position, via);
  }

  /** Spring to `target` (an integer position), optionally carrying the release velocity (positions/s). */
  springTo(target: number, via: Via, velocity = 0): void {
    this.stop();
    this.target = target;
    if (prefersReducedMotion()) {
      this.set(target, via);
      this.settle(via);
      return;
    }
    this.stage.dataset.moving = '';
    const controls = animateValue<number>({
      keyframes: [this.current, target],
      ...spring.wheel,
      velocity,
      onUpdate: (value) => this.set(value, via),
    });
    this.animation = controls;
    controls.then(() => {
      if (this.animation !== controls) return;
      this.animation = null;
      this.set(target, via);
      this.settle(via);
    });
  }

  /** Free-form animation of the position (the intro spin), resolved when finished. */
  animatePosition(
    to: number,
    options: Omit<ValueAnimationOptions<number>, 'keyframes' | 'onUpdate'>,
    via: Via = 'intro',
  ): AnimationPlaybackControls {
    this.stop();
    this.target = to;
    this.stage.dataset.moving = '';
    const controls = animateValue<number>({
      ...options,
      keyframes: [this.current, to],
      onUpdate: (value) => this.set(value, via),
    });
    this.animation = controls;
    controls.then(() => {
      if (this.animation !== controls) return;
      this.animation = null;
      this.set(to, via);
      this.settle(via);
    });
    return controls;
  }

  stop(): void {
    if (!this.animation) return;
    const running = this.animation;
    this.animation = null;
    running.stop();
    delete this.stage.dataset.moving;
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

  private set(position: number, via: Via): void {
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
