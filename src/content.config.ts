/**
 * Astro content collections over the Keystatic folders.
 * Mirrors keystatic.config.ts; change both together.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const STATUS = ['live', 'nda', 'coming-soon', 'placeholder'] as const;

/** Keystatic writes empty text fields as "" (or omits them); treat both as missing. */
const text = () => z.string().nullish().transform((value) => value?.trim() || undefined);

const caseStudies = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/case-studies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      tocLabel: z.string(),
      cardMeta: text(),
      status: z.enum(STATUS).default('placeholder'),
      order: z.number().int().min(1),
      draft: z.boolean().default(false),
      heroVideo: z
        .object({
          poster: image().nullish().transform((value) => value ?? undefined),
          alt: z.string().default(''),
          mp4: text(),
          webm: text(),
        })
        .default({ poster: undefined, alt: '', mp4: undefined, webm: undefined }),
      ogImage: image().nullish().transform((value) => value ?? undefined),
      seoDescription: z.string().max(160).nullish().transform((value) => value ?? undefined),

      role: text(),
      timeline: text(),
      team: z.array(z.object({ name: z.string(), role: text() })).default([]),
      tools: z.array(z.string()).default([]),

      context: z
        .object({
          blocks: z
            .array(z.object({ heading: text(), body: text(), items: z.array(z.string()).default([]) }))
            .default([]),
          facts: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
          note: text(),
        })
        .optional(),
      overview: z
        .object({
          heading: text(),
          intro: text(),
          challengeLabel: z.string().default('The challenge'),
          challenge: z.array(z.string()).default([]),
          insightLabel: z.string().default('The key insight'),
          insight: text(),
        })
        .optional(),
      solution: z
        .array(
          z.object({
            heading: z.string(),
            body: text(),
            media: z
              .object({ image: image().nullish().transform((value) => value ?? undefined), alt: z.string().default(''), mp4: text(), webm: text() })
              .optional(),
          }),
        )
        .default([]),
      system: z
        .object({
          heading: text(),
          intro: text(),
          image: image().nullish().transform((value) => value ?? undefined),
          alt: z.string().default(''),
          /** Slug of the case study the image links to. */
          link: text(),
          cards: z.array(z.object({ title: z.string(), body: text() })).default([]),
        })
        .optional(),
      finalDesigns: z
        .array(
          z.object({
            image: image(),
            imageMobile: image().nullish().transform((value) => value ?? undefined),
            alt: z.string().default(''),
            layout: z.enum(['full', 'half']).default('full'),
          }),
        )
        .default([]),
      outcome: z
        .object({
          heading: text(),
          intro: text(),
          cards: z.array(z.object({ title: z.string(), body: text() })).default([]),
        })
        .optional(),
      reflection: z.object({ heading: text(), body: text() }).optional(),
    }),
});

const summaries = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/summaries' }),
  schema: z.object({
    page: z.string(),
    recruiter: z.string().optional(),
    designer: z.string().optional(),
    curious: z.string().optional(),
    generatedWith: z
      .object({ model: z.string().optional(), date: z.coerce.date().optional() })
      .optional(),
    reviewed: z.boolean().default(false),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: 'about.yaml', base: './src/content' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      currently: z.string(),
      affiliations: z.array(z.object({ name: z.string(), logo: image() })).default([]),
      bio: z.array(z.string()).default([]),
      avatar: image().optional(),
      avatarAlt: z.string().default(''),
      banner: image().optional(),
      bannerAlt: z.string().default(''),
      gallery: z.array(z.object({ image: image(), alt: z.string() })).default([]),
      journey: z
        .array(z.object({ role: z.string(), years: z.string(), place: z.string() }))
        .default([]),
    }),
});

const siteSettings = defineCollection({
  loader: glob({ pattern: 'site-settings.yaml', base: './src/content' }),
  schema: ({ image }) =>
    z.object({
      siteName: z.string(),
      titleTemplate: z.string().default('%s'),
      description: z.string().max(160),
      defaultOgImage: image().optional(),
      nav: z.object({ about: z.string(), resume: z.string(), contact: z.string() }),
      contact: z.string().regex(/^(mailto:|https:\/\/)/),
      resume: z.string().optional(),
      socials: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
      footerCredit: z.string(),
    }),
});

export const collections = { caseStudies, summaries, about, siteSettings };
