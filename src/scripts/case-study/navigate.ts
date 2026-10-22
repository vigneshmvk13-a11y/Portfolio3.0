/**
 * Going to another project in a known direction. The intent tells the page transition
 * (src/scripts/page-transition.js) which way to slide.
 */
export type Direction = 'prev' | 'next';

export function goToProject(direction: Direction, slug: string): void {
  document.documentElement.dataset.vtIntent = direction;
  window.location.href = `/work/${slug}/`;
}
