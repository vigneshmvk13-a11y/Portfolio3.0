/** Links to another site open in a new tab (design/rules.md → Links). Site links are always relative. */
export const isExternal = (href: string | undefined): boolean => /^(https?:)?\/\//.test(href ?? '');

/** `target`/`rel` for an anchor; the rel keeps the new tab from reaching back into this one. */
export const externalAttrs = (external: boolean) =>
  external ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : ({} as const);
