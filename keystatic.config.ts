/**
 * Keystatic CMS (local mode, admin at /keystatic in dev only).
 * src/content.config.ts mirrors this schema with Zod; change both together.
 */
import { config, collection, singleton, fields } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

const STATUS = [
  { label: 'Live', value: 'live' },
  { label: 'NDA protected', value: 'nda' },
  { label: 'Coming soon', value: 'coming-soon' },
  { label: 'Placeholder', value: 'placeholder' },
] as const;

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Portfolio 3.0' },
  },
  collections: {
    caseStudies: collection({
      label: 'Case studies',
      slugField: 'title',
      path: 'src/content/case-studies/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      columns: ['title', 'order', 'status'],
      schema: {
        title: fields.slug({
          name: { label: 'Project name', description: 'Sets the URL and the browser tab title, e.g. "Smart Mapping"' },
        }),
        subtitle: fields.text({
          label: 'Title',
          description: 'The full title: homepage card (desktop and mobile) and the case-study page heading',
          validation: { isRequired: true },
        }),
        tocLabel: fields.text({
          label: 'Short title',
          description: 'Shown in the TOC (mobile and desktop), e.g. "Data mapping"',
          validation: { isRequired: true },
        }),
        cardMeta: fields.text({ label: 'Card tags', description: 'Desktop card, e.g. "B2B • SAAS"' }),
        status: fields.select({ label: 'Status', options: STATUS, defaultValue: 'placeholder' }),
        order: fields.integer({ label: 'Homepage order', validation: { isRequired: true, min: 1 } }),
        draft: fields.checkbox({
          label: 'Draft',
          description: 'Never built in production',
          defaultValue: false,
        }),
        role: fields.text({ label: 'Role' }),
        timeline: fields.text({ label: 'Timeline' }),
        tools: fields.array(fields.text({ label: 'Tool' }), {
          label: 'Tools',
          itemLabel: (props) => props.value,
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Case-study tags',
          description: 'Case-study page, after role and timeline',
          itemLabel: (props) => props.value,
        }),
        heroVideo: fields.object(
          {
            poster: fields.image({
              label: 'Poster (still frame, shown until the video plays)',
              directory: 'src/assets/covers',
              publicPath: '../../assets/covers/',
            }),
            alt: fields.text({ label: 'Alt text', description: 'Describe the content, not the file' }),
            mp4: fields.file({ label: 'MP4 (H.264, ≤ 4 MB)', directory: 'public/media', publicPath: '/media/' }),
            webm: fields.file({ label: 'WebM (≤ 4 MB)', directory: 'public/media', publicPath: '/media/' }),
          },
          {
            label: 'Cover image',
            description: 'Looping video (MP4 + WebM, ≤ 4 MB each) and its poster. Card and case-study page.',
          },
        ),
        ogImage: fields.image({
          label: 'OG image (1200×630)',
          directory: 'src/assets/og',
          publicPath: '../../assets/og/',
        }),
        seoDescription: fields.text({
          label: 'SEO description',
          multiline: true,
          validation: { length: { max: 160 } },
        }),
        outcomes: fields.array(
          fields.object({
            label: fields.text({ label: 'Label', validation: { isRequired: true } }),
            value: fields.text({ label: 'Value', validation: { isRequired: true } }),
            note: fields.text({ label: 'Note' }),
          }),
          {
            label: 'Outcomes',
            description: 'Real numbers only. Leave empty rather than estimate.',
            itemLabel: (props) => `${props.fields.value.value} ${props.fields.label.value}`,
          },
        ),
        decisions: fields.array(
          fields.object({
            id: fields.text({
              label: 'Id',
              description: 'Referenced by <Decision id="…" /> in the body',
              validation: { isRequired: true },
            }),
            title: fields.text({ label: 'Decision', validation: { isRequired: true } }),
            context: fields.text({ label: 'Context', multiline: true }),
            optionsConsidered: fields.array(
              fields.object({
                option: fields.text({ label: 'Option' }),
                tradeoff: fields.text({ label: 'Trade-off', multiline: true }),
              }),
              { label: 'Options considered', itemLabel: (props) => props.fields.option.value },
            ),
            chosen: fields.text({ label: 'Chosen' }),
            why: fields.text({ label: 'Why', multiline: true }),
            evidenceText: fields.text({ label: 'Evidence (text)', multiline: true }),
            evidenceImage: fields.image({
              label: 'Evidence (image)',
              directory: 'src/assets/evidence',
              publicPath: '../../assets/evidence/',
            }),
          }),
          { label: 'Decisions', itemLabel: (props) => props.fields.title.value },
        ),
        body: fields.mdx({
          label: 'Body',
          extension: 'mdx',
          components: {
            Decision: block({
              label: 'Decision',
              schema: { id: fields.text({ label: 'Decision id' }) },
            }),
          },
        }),
      },
    }),

    summaries: collection({
      label: 'Summaries',
      slugField: 'page',
      path: 'src/content/summaries/*',
      format: { data: 'yaml' },
      schema: {
        page: fields.slug({
          name: { label: 'Page id', description: 'home, about, or a case-study slug' },
        }),
        recruiter: fields.mdx.inline({ label: 'Recruiter' }),
        designer: fields.mdx.inline({ label: 'Designer' }),
        curious: fields.mdx.inline({ label: 'Curious' }),
        generatedWith: fields.object(
          {
            model: fields.text({ label: 'Model' }),
            date: fields.date({ label: 'Date' }),
          },
          { label: 'Generated with' },
        ),
        reviewed: fields.checkbox({
          label: 'Reviewed',
          description: 'Unreviewed summaries never render',
          defaultValue: false,
        }),
      },
    }),
  },

  singletons: {
    about: singleton({
      label: 'About',
      path: 'src/content/about',
      format: { data: 'yaml' },
      schema: {
        name: fields.text({ label: 'Name' }),
        role: fields.text({ label: 'Role' }),
        currently: fields.text({ label: 'Current work line', multiline: true }),
        affiliations: fields.array(
          fields.object({
            name: fields.text({ label: 'Name (alt text)' }),
            logo: fields.image({ label: 'Logo', directory: 'src/assets/logos', publicPath: '../assets/logos/' }),
          }),
          { label: 'Affiliations', itemLabel: (props) => props.fields.name.value },
        ),
        bio: fields.array(fields.mdx.inline({ label: 'Paragraph' }), { label: 'Bio paragraphs' }),
        avatar: fields.image({ label: 'Avatar', directory: 'src/assets/about', publicPath: '../assets/about/' }),
        avatarAlt: fields.text({ label: 'Avatar alt' }),
        banner: fields.image({ label: 'Banner', directory: 'src/assets/about', publicPath: '../assets/about/' }),
        bannerAlt: fields.text({ label: 'Banner alt (empty if decorative)' }),
        gallery: fields.array(
          fields.object({
            image: fields.image({
              label: 'Image',
              directory: 'src/assets/about',
              publicPath: '../assets/about/',
            }),
            alt: fields.text({ label: 'Alt text' }),
          }),
          { label: 'Gallery', itemLabel: (props) => props.fields.alt.value },
        ),
        journey: fields.array(
          fields.object({
            role: fields.text({ label: 'Role' }),
            years: fields.text({ label: 'Years' }),
            place: fields.text({ label: 'Place' }),
          }),
          {
            label: 'Journey',
            itemLabel: (props) => `${props.fields.role.value} · ${props.fields.years.value}`,
          },
        ),
      },
    }),

    siteSettings: singleton({
      label: 'Site settings',
      path: 'src/content/site-settings',
      format: { data: 'yaml' },
      schema: {
        siteName: fields.text({ label: 'Site name' }),
        titleTemplate: fields.text({
          label: 'Title template',
          description: '%s is replaced by the page title',
        }),
        description: fields.text({
          label: 'Default description',
          multiline: true,
          validation: { length: { max: 160 } },
        }),
        defaultOgImage: fields.image({
          label: 'Default OG image',
          directory: 'src/assets/og',
          publicPath: '../assets/og/',
        }),
        nav: fields.object(
          {
            about: fields.text({ label: 'About label' }),
            resume: fields.text({ label: 'Resume label' }),
            contact: fields.text({ label: 'Contact label' }),
          },
          { label: 'Button labels (aria-labels)' },
        ),
        contact: fields.text({
          label: 'Contact link',
          description: 'mailto: or https:// URL',
          validation: {
            pattern: { regex: /^(mailto:|https:\/\/)/, message: 'Start with mailto: or https://' },
          },
        }),
        resume: fields.file({ label: 'Resume PDF', directory: 'public', publicPath: '/' }),
        socials: fields.array(
          fields.object({
            label: fields.text({ label: 'Label' }),
            url: fields.url({ label: 'URL' }),
          }),
          { label: 'Social links', itemLabel: (props) => props.fields.label.value },
        ),
        footerCredit: fields.text({ label: 'Footer credit' }),
      },
    }),
  },
});
