/**
 * The fill and stroke of an action button (IconButton sm / lg / cta, Button), Vignesh 2026-10-26:
 * where there is a hover, gray/50 fill and stroke at rest, gray/white with a gray/200 stroke on hover;
 * on touch (no hover) it is gray/white with gray/200 all the time. `hoverable` is in global.css.
 */
export const actionSurface =
  'border-line-default bg-surface-raised text-fg-secondary-on-fill hoverable:border-surface-subtle hoverable:bg-surface-subtle hover:border-line-default hover:bg-surface-raised hover:text-fg-primary';
