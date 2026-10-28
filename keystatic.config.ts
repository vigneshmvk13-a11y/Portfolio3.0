/**
 * Keystatic CMS (local mode, admin at /keystatic in dev only).
 * src/content.config.ts mirrors this schema with Zod; change both together.
 */
import { config, collection, singleton, fields } from '@keystatic/core';

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
      format: { data: 'yaml' },
      columns: ['title', 'order', 'status'],
      schema: {
        title: fields.slug({
          name: { label: 'Project name', description: 'Sets the URL, e.g. "Data Mapping" → /work/data-mapping' },
        }),
        subtitle: fields.text({
          label: 'Title',
          description: 'The full title: homepage card (desktop and mobile) and the case-study page heading',
          validation: { isRequired: true },
        }),
        tocLabel: fields.text({
          label: 'Short title',
          description: 'TOC (mobile and desktop) and the browser tab title, e.g. "Data mapping"',
          validation: { isRequired: true },
        }),
        cardMeta: fields.text({
          label: 'Tags',
          description: 'Desktop card and above the case-study title, e.g. "B2B • SAAS"',
        }),
        year: fields.text({
          label: 'Year',
          description: 'Desktop card, above the tags, e.g. "2025"',
        }),
        status: fields.select({ label: 'Status', options: STATUS, defaultValue: 'placeholder' }),
        order: fields.integer({
          label: 'Homepage order',
          description: 'Also the order of Previous / Next and More projects',
          validation: { isRequired: true, min: 1 },
        }),
        draft: fields.checkbox({
          label: 'Draft',
          description: 'Never built in production',
          defaultValue: false,
        }),
        lightCover: fields.checkbox({
          label: 'Light cover',
          description: 'The cover is pale where the caption sits: use the stronger caption fill (80% instead of 50%) so the white title stays readable',
          defaultValue: false,
        }),
        heroVideo: fields.object(
          {
            poster: fields.image({
              label: 'Poster (still frame, shown until the video plays)',
              directory: 'src/assets/covers',
              publicPath: '../../assets/covers/',
            }),
            alt: fields.text({ label: 'Alt text', description: 'Describe the content, not the file' }),
            mp4: fields.file({ label: 'MP4 (H.264, ≤ 5 MB; needed for iPhone)', directory: 'public/media', publicPath: '/media/' }),
            webm: fields.file({ label: 'WebM (≤ 5 MB)', directory: 'public/media', publicPath: '/media/' }),
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

        // Meta row under the cover.
        role: fields.text({ label: 'Role' }),
        timeline: fields.text({ label: 'Timeline' }),
        team: fields.array(
          fields.object({
            name: fields.text({ label: 'Name', validation: { isRequired: true } }),
            role: fields.text({ label: 'Role' }),
          }),
          {
            label: 'Team',
            description: 'Shown as "Name (Role)"',
            itemLabel: (props) => props.fields.name.value,
          },
        ),
        tools: fields.array(fields.text({ label: 'Tool' }), {
          label: 'Tools',
          description: 'Not shown on the page yet',
          itemLabel: (props) => props.value,
        }),

        // Sections, in page order. Each one (and its tab) appears only when it has content.
        context: fields.object(
          {
            blocks: fields.array(
              fields.object({
                heading: fields.text({ label: 'Heading' }),
                body: fields.text({ label: 'Text', multiline: true, description: 'A blank line starts a new paragraph' }),
                items: fields.array(fields.text({ label: 'Item' }), {
                  label: 'Bullet list (optional)',
                  itemLabel: (props) => props.value,
                }),
              }),
              { label: 'Blocks', itemLabel: (props) => props.fields.heading.value || 'Block' },
            ),
            facts: fields.array(
              fields.object({
                label: fields.text({ label: 'Label', validation: { isRequired: true } }),
                value: fields.text({ label: 'Value', validation: { isRequired: true } }),
              }),
              {
                label: 'Facts',
                description: 'Lines after the text, shown as "Label: value", e.g. Role: Sole Designer & Developer',
                itemLabel: (props) => props.fields.label.value,
              },
            ),
            note: fields.text({ label: 'Note', description: 'Small text at the end' }),
          },
          {
            label: 'Context',
            description: 'For case studies without the full sections (NDA, personal projects): heading and text blocks',
          },
        ),
        overview: fields.object(
          {
            heading: fields.text({ label: 'Heading' }),
            intro: fields.text({ label: 'Intro', multiline: true }),
            challengeLabel: fields.text({ label: 'Challenge label', defaultValue: 'The challenge' }),
            challenge: fields.array(fields.text({ label: 'Point', multiline: true }), {
              label: 'Challenge (bullets)',
              itemLabel: (props) => props.value,
            }),
            insightLabel: fields.text({ label: 'Insight label', defaultValue: 'The key insight' }),
            insight: fields.text({ label: 'Insight', multiline: true }),
          },
          { label: 'Overview', description: 'Long text: a blank line starts a new paragraph' },
        ),
        solution: fields.array(
          fields.object({
            heading: fields.text({ label: 'Heading', validation: { isRequired: true } }),
            body: fields.text({ label: 'Text', multiline: true }),
            media: fields.object(
              {
                image: fields.image({
                  label: 'Image (the poster, if there is a video)',
                  directory: 'src/assets/case-studies',
                  publicPath: '../../assets/case-studies/',
                }),
                alt: fields.text({ label: 'Alt text', description: 'Describe the content, not the file' }),
                mp4: fields.file({ label: 'MP4 (H.264, ≤ 5 MB; needed for iPhone)', directory: 'public/media', publicPath: '/media/' }),
                webm: fields.file({ label: 'WebM (optional, ≤ 5 MB)', directory: 'public/media', publicPath: '/media/' }),
              },
              { label: 'Media' },
            ),
          }),
          { label: 'Solution', description: 'One step per decision', itemLabel: (props) => props.fields.heading.value },
        ),
        system: fields.object(
          {
            heading: fields.text({ label: 'Heading' }),
            intro: fields.text({ label: 'Intro', multiline: true }),
            image: fields.image({
              label: 'Image',
              directory: 'src/assets/case-studies',
              publicPath: '../../assets/case-studies/',
            }),
            alt: fields.text({
              label: 'Alt text',
              description: 'Describe the content, not the file. Used when the image has no link.',
            }),
            link: fields.relationship({
              label: 'Links to',
              description: 'The case study the image opens, e.g. the design system case study',
              collection: 'caseStudies',
            }),
            cards: fields.array(
              fields.object({
                title: fields.text({ label: 'Title', validation: { isRequired: true } }),
                body: fields.text({ label: 'Text', multiline: true }),
              }),
              { label: 'Cards', itemLabel: (props) => props.fields.title.value },
            ),
          },
          { label: 'System', description: 'Design system: image (optionally a link to another case study) and cards' },
        ),
        finalDesigns: fields.array(
          fields.object({
            image: fields.image({
              label: 'Image (desktop)',
              directory: 'src/assets/case-studies',
              publicPath: '../../assets/case-studies/',
              validation: { isRequired: true },
            }),
            imageMobile: fields.image({
              label: 'Image (mobile, optional)',
              description: 'A recomposed crop for phones. Without it, phones get the desktop image.',
              directory: 'src/assets/case-studies',
              publicPath: '../../assets/case-studies/',
            }),
            alt: fields.text({ label: 'Alt text', description: 'Describe the content, not the file' }),
            layout: fields.select({
              label: 'Layout (desktop)',
              description: 'Two half-width images in a row sit side by side',
              options: [
                { label: 'Full width', value: 'full' },
                { label: 'Half width', value: 'half' },
              ],
              defaultValue: 'full',
            }),
          }),
          { label: 'Final designs', itemLabel: (props) => props.fields.alt.value || 'Image' },
        ),
        outcome: fields.object(
          {
            heading: fields.text({ label: 'Heading' }),
            intro: fields.text({ label: 'Intro', multiline: true }),
            cards: fields.array(
              fields.object({
                title: fields.text({ label: 'Title', validation: { isRequired: true } }),
                body: fields.text({ label: 'Text', multiline: true }),
              }),
              { label: 'Cards', itemLabel: (props) => props.fields.title.value },
            ),
          },
          { label: 'Outcome' },
        ),
        reflection: fields.object(
          {
            heading: fields.text({ label: 'Heading' }),
            body: fields.text({ label: 'Text', multiline: true, description: 'A blank line starts a new paragraph' }),
          },
          { label: 'Reflection' },
        ),
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
    home: singleton({
      label: 'Homepage hero',
      path: 'src/content/home',
      format: { data: 'yaml' },
      schema: {
        headline: fields.text({ label: 'Headline', description: 'First line of the hero, e.g. "I\'m Vignesh,"' }),
        role: fields.text({ label: 'Role', description: 'Shown in grey after the headline (its own line on desktop), e.g. "Design Leader"' }),
        currently: fields.text({ label: 'Current work line', multiline: true }),
        affiliations: fields.array(
          fields.object({
            name: fields.text({ label: 'Name (alt text)' }),
            logo: fields.image({ label: 'Logo', directory: 'src/assets/logos', publicPath: '../assets/logos/' }),
            logoHover: fields.image({ label: 'Logo (hover)', directory: 'src/assets/logos', publicPath: '../assets/logos/' }),
            url: fields.url({ label: 'Link (opens in a new tab)' }),
          }),
          { label: 'Affiliations', description: 'Logo pills: "@" before the first, "&" before the rest', itemLabel: (props) => props.fields.name.value },
        ),
      },
    }),

    about: singleton({
      label: 'About',
      path: 'src/content/about',
      format: { data: 'yaml' },
      schema: {
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
            title: fields.text({ label: 'Card title', description: 'e.g. "Avenged sevenfold live"' }),
            caption: fields.text({ label: 'Card caption', description: 'Place • Year, e.g. "Badland, Bangalore • Circa 2024"' }),
          }),
          { label: 'Gallery', itemLabel: (props) => props.fields.title.value || props.fields.alt.value },
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
        favicon: fields.image({
          label: 'Favicon',
          description: 'Browser tab icon. Square SVG (best), PNG or JPG, at least 48×48. Keep it to one simple shape: it shows at 16px.',
          directory: 'public',
          publicPath: '/',
        }),
        appleTouchIcon: fields.image({
          label: 'Home-screen icon',
          description: 'iPhone home screen and bookmarks. 180×180 PNG or JPG with a solid background (no transparency).',
          directory: 'public',
          publicPath: '/',
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
        resume: fields.text({
          label: 'Resume link',
          description: 'https:// link to the resume (opens in a new tab)',
          validation: { pattern: { regex: /^https:\/\//, message: 'Start with https://' } },
        }),
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
