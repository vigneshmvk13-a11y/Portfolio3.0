import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type CaseStudy = CollectionEntry<'caseStudies'>;

/** Case studies in homepage order. Drafts are excluded from production builds. */
export async function getPublishedCaseStudies(): Promise<CaseStudy[]> {
  const entries = await getCollection('caseStudies', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/** Previous and next case study in homepage order, wrapping at both ends. */
export function neighboursOf(entries: CaseStudy[], id: string): { previous: CaseStudy; next: CaseStudy } {
  const i = entries.findIndex((entry) => entry.id === id);
  const n = entries.length;
  return { previous: entries[(i - 1 + n) % n], next: entries[(i + 1) % n] };
}

/** The `count` case studies after `id` in homepage order, wrapping, never `id` itself. */
export function moreProjects(entries: CaseStudy[], id: string, count = 3): CaseStudy[] {
  const i = entries.findIndex((entry) => entry.id === id);
  const others = [...entries.slice(i + 1), ...entries.slice(0, i)];
  return others.slice(0, count);
}

/** Splits CMS long text into paragraphs: a blank line starts a new one. */
export function paragraphs(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type CaseSection = { id: string; label: string };

/** Case-study sections that have content, in page order. They drive the tabs and the section anchors. */
export function sectionsOf({ data }: CaseStudy): CaseSection[] {
  const sections: (CaseSection & { filled: boolean })[] = [
    { id: 'context', label: 'Context', filled: Boolean(data.context?.blocks.length) },
    { id: 'overview', label: 'Overview', filled: Boolean(data.overview?.heading || data.overview?.intro) },
    { id: 'solution', label: 'Solution', filled: data.solution.length > 0 },
    { id: 'system', label: 'System', filled: Boolean(data.system?.heading || data.system?.image) },
    { id: 'final-designs', label: 'Final designs', filled: data.finalDesigns.length > 0 },
    { id: 'outcome', label: 'Outcome', filled: Boolean(data.outcome?.heading || data.outcome?.cards.length) },
    { id: 'reflection', label: 'Reflection', filled: Boolean(data.reflection?.heading || data.reflection?.body) },
  ];
  return sections.filter((s) => s.filled).map(({ id, label }) => ({ id, label }));
}

export async function getAbout() {
  const entry = await getEntry('about', 'about');
  if (!entry) throw new Error('Missing src/content/about.yaml');
  return entry.data;
}

export async function getSiteSettings() {
  const entry = await getEntry('siteSettings', 'site-settings');
  if (!entry) throw new Error('Missing src/content/site-settings.yaml');
  return entry.data;
}
