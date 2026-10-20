/**
 * Astro content collections over the Keystatic folders.
 * Mirrors keystatic.config.ts; change both together.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const STATUS = ['live', 'nda', 'coming-soon', 'placeholder'] as const;

const caseStudies = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/case-studies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      tocLabel: z.string(),
      cardMeta: z.string().optional(),
      status: z.enum(STATUS).default('placeholder'),
      order: z.number().int().min(1),
      draft: z.boolean().default(false),
      role: z.string().optional(),
      timeline: z.string().optional(),
      tools: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      heroVideo: z
        .object({
          poster: image().optional(),
          alt: z.string().default(''),
          mp4: z.string().optional(),
          webm: z.string().optional(),
        })
        .default({ alt: '' }),
      ogImage: image().optional(),
      seoDescription: z.string().max(160).optional(),
      outcomes: z
        .array(z.object({ label: z.string(), value: z.string(), note: z.string().optional() }))
        .default([]),
      decisions: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            context: z.string().optional(),
            optionsConsidered: z
              .array(z.object({ option: z.string(), tradeoff: z.string().optional() }))
              .default([]),
            chosen: z.string().optional(),
            why: z.string().optional(),
            evidenceText: z.string().optional(),
            evidenceImage: image().optional(),
          }),
        )
        .default([]),
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
