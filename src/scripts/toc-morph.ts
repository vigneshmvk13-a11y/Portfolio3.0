/**
 * Mobile TOC morph (design/layout-and-motion.md → TOC handle). One progress number `p` (0 = tab,
 * 1 = panel) is sprung with Motion and drawn each frame: the outline, five bars (ticks growing into
 * rows), the row highlight and the labels' fade. Geometry lives in toc-shape.ts.
 *
 * - Press the tab: it opens. Drag: the row under the finger is highlighted and the wheel spins to it.
 *   Release after dragging: it collapses (the wheel stays on the last row; past the ends it clamps).
 * - Quick tap: it opens and stays open until a project, the tab or the outside is tapped.
 *   Held still and released: it collapses.
 * - Keyboard: Enter/Space on the tab toggles; focus moves to the highlighted row; Esc closes.
 * - The sheet stays collapsed while a finger scrubs (toc:hold / toc:release, sheet.ts).
 * - Reduced motion: the morph and highlight are instant; the wheel still turns (its own rule).
 */
import { animateValue, type AnimationPlaybackControlsWithThen as Controls } from 'motion';
import { spring, toc as timing } from '../lib/motion';
import { prefersReducedMotion } from '../lib/reduced-motion';
import { PANEL, TAB, barAt, lerp, rowAt, shapeAt } from './toc-shape';
import type { WheelController, WheelDetail } from './wheel/controller';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function bindTocMorph(controller: WheelController): void {
  const root = document.querySelector<HTMLElement>('[data-toc-morph]');
  const svgs = root ? [...root.querySelectorAll<SVGSVGElement>('[data-toc-svg], [data-toc-bars]')] : [];
  const outline = root?.querySelector<SVGPathElement>('[data-toc-outline]');
  const highlight = root?.querySelector<SVGRectElement>('[data-toc-highlight]');
  const clip = root?.querySelector<HTMLElement>('[data-toc-clip]');
  const panel = root?.querySelector<HTMLElement>('[data-toc-panel]');
  const handle = root?.querySelector<HTMLButtonElement>('[data-toc-handle]');
  if (!root || svgs.length !== 2 || !outline || !highlight || !clip || !panel || !handle) return;
  const ticks = [...root.querySelectorAll<SVGRectElement>('[data-toc-tick]')];
  const rows = [...panel.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')];
  const count = rows.length;

  let p = 0;
  /** Highlighted row; fractional while it slides between rows. */
  let hl = controller.index;
  let panelW = PANEL.minW;
  let open = false;
  let morph: Controls | null = null;
  let slide: Controls | null = null;

  const setBar = (el: SVGRectElement, bar: ReturnType<typeof barAt>) => {
    el.setAttribute('x', bar.x.toFixed(2));
    el.setAttribute('y', bar.y.toFixed(2));
    el.setAttribute('width', bar.w.toFixed(2));
    el.setAttribute('height', bar.h.toFixed(2));
    el.setAttribute('rx', bar.rx.toFixed(2));
  };

  const render = () => {
    const { w, h, path } = shapeAt(p, panelW);
    const bars = Math.max(0, p); // the spring may undershoot on close; the bars stop at tick size
    root.style.width = `${w}px`;
    root.style.height = `${h}px`;
    for (const svg of svgs) {
      svg.setAttribute('width', w.toFixed(2));
      svg.setAttribute('height', h.toFixed(2));
      svg.setAttribute('viewBox', `0 0 ${w.toFixed(2)} ${h.toFixed(2)}`);
    }
    outline.setAttribute('d', path);
    clip.style.clipPath = `path('${path}')`; // the fill, bars and labels: one shape
    ticks.forEach((tick, i) => {
      setBar(tick, barAt(i, ticks.length, bars, panelW, w, h));
      tick.setAttribute('opacity', String(1 - clamp01(p)));
    });
    setBar(highlight, barAt(hl, count, bars, panelW, w, h));
    highlight.setAttribute('opacity', String(clamp01(p)));
    // Labels ride their bars: the list's left edge follows the bars' left edge, and each row follows
    // its bar's spacing, so text never sits apart from the shape that's growing into its row.
    const lead = barAt(0, count, bars, panelW, w, h);
    const dx = panelW - PANEL.row.inset - (w - lead.x);
    const spread = lerp(TAB.tick.pitch, PANEL.row.pitch, bars) - PANEL.row.pitch;
    panel.style.transform = `translateX(${dx.toFixed(2)}px)`;
    rows.forEach((row, i) => (row.style.transform = `translateY(${((i - (count - 1) / 2) * spread).toFixed(2)}px)`));
    panel.style.opacity = String(clamp01((p - timing.labelFadeFrom) / (1 - timing.labelFadeFrom)));
  };

  /** The panel widens to its longest label (rows keep that width while the frame morphs). */
  const measure = () => {
    panel.style.width = 'max-content';
    panelW = Math.max(PANEL.minW, panel.offsetWidth + 2 * PANEL.row.inset);
    panel.style.width = `${panelW - 2 * PANEL.row.inset}px`;
    render();
  };

  const markRow = (index: number) => rows.forEach((row, i) => row.toggleAttribute('data-hl', i === index));

  const highlightTo = (index: number) => {
    markRow(index);
    slide?.stop();
    if (prefersReducedMotion() || p <= 0) {
      hl = index;
      render();
      return;
    }
    slide = animateValue<number>({ keyframes: [hl, index], ...spring.toc, onUpdate: (v) => ((hl = v), render()) });
  };

  const setOpen = (next: boolean) => {
    if (open === next) return;
    open = next;
    handle.setAttribute('aria-expanded', String(next));
    panel.inert = !next;
    morph?.stop();
    if (prefersReducedMotion()) {
      p = next ? 1 : 0;
      render();
      return;
    }
    morph = animateValue<number>({ keyframes: [p, next ? 1 : 0], ...spring.toc, onUpdate: (v) => ((p = v), render()) });
  };

  // ---------- Pointer: press, scrub, release ----------
  let pointerId: number | null = null;
  let downAt = 0;
  let startY = 0;
  let centreY = 0;
  let wasOpen = false;
  let scrubbing = false;
  let target = -1;
  let suppressClick = false;

  root.addEventListener('pointerdown', (event) => {
    if (!controller.enabled || pointerId !== null || event.button > 0) return;
    if (!open && event.target !== handle) return; // collapsed: only the tab responds
    pointerId = event.pointerId;
    downAt = event.timeStamp;
    startY = event.clientY;
    const rect = root.getBoundingClientRect(); // grows symmetrically, so its centre is the panel's
    centreY = rect.top + rect.height / 2;
    wasOpen = open;
    scrubbing = false;
    target = controller.index;
    if (!open) setOpen(true);
  });

  root.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    if (!scrubbing) {
      if (Math.abs(event.clientY - startY) < timing.scrubSlop) return;
      scrubbing = true;
      root.setPointerCapture(event.pointerId); // keep scrubbing past the panel's edges
      document.dispatchEvent(new CustomEvent('toc:hold'));
    }
    const index = rowAt(event.clientY - centreY, count);
    if (index === target) return;
    target = index;
    highlightTo(index);
    controller.goTo(index, 'toc');
  });

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (scrubbing) {
      scrubbing = false;
      suppressClick = true;
      window.setTimeout(() => (suppressClick = false), 0);
      setOpen(false);
      document.dispatchEvent(new CustomEvent('toc:release'));
      return;
    }
    if (event.type === 'pointercancel') return setOpen(false);
    const held = (event.timeStamp - downAt) / 1000 >= timing.tapMax;
    if (!wasOpen) {
      if (held) setOpen(false); // held still, then let go: back to the tab
    } else if (event.target === handle) {
      setOpen(false); // tapping the tab again closes it
    }
    // A tap on a row falls through to its click (toc.ts rotates; the listener below closes).
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);

  // A scrub's pointerup must not also click the row under the finger.
  root.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  // Picking a project (toc.ts prevented the navigation and rotated the wheel) closes the panel.
  for (const row of rows) {
    row.addEventListener('click', (event) => {
      if (!event.defaultPrevented) return; // modifier-click: opening the case study
      setOpen(false);
      if (event.detail === 0) handle.focus();
    });
  }

  // ---------- Keyboard and dismissal ----------
  handle.addEventListener('click', (event) => {
    if (event.detail !== 0) return; // pointer taps are handled above
    setOpen(!open);
    if (open) rows[controller.index]?.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (!open || event.key !== 'Escape') return;
    setOpen(false);
    handle.focus();
  });

  root.addEventListener('focusout', (event) => {
    if (open && pointerId === null && !root.contains(event.relatedTarget as Node | null)) setOpen(false);
  });

  // A tap outside only dismisses: its click must not also step the wheel or open a card behind it.
  let swallowClick = false;
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!open || pointerId !== null || root.contains(event.target as Node)) return;
      setOpen(false);
      swallowClick = true;
      window.setTimeout(() => (swallowClick = false), timing.tapMax * 1000 * 2);
    },
    true,
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  document.addEventListener('drawer:open', () => setOpen(false));

  // ---------- Sync with the wheel ----------
  controller.stage.addEventListener('wheel:change', (event) => {
    if (scrubbing) return; // the finger leads while scrubbing
    highlightTo((event as CustomEvent<WheelDetail>).detail.index);
  });

  markRow(controller.index);
  measure();
  void document.fonts?.ready.then(measure);
}
