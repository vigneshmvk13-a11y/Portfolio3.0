import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type CaseStudy = CollectionEntry<'caseStudies'>;

/** Case studies in homepage order. Drafts are excluded from production builds. */
export async function getPublishedCaseStudies(): Promise<CaseStudy[]> {
  const entries = await getCollection('caseStudies', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.sort((a, b) => a.data.order - b.data.order);
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
