// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';

/**
 * Dev-only tooling: the Keystatic admin and the internal pages in src/dev/.
 * Registered from `astro:config:setup` so it only exists under `astro dev`;
 * the production build stays fully static with no admin routes.
 * (Astro ignores `_`-prefixed page files, so these routes are injected.)
 * The dev server also gets its own Vite cache: `astro check` / `astro build` run alongside it used to
 * rewrite the shared node_modules/.vite/deps, and the running server then refused its pre-bundled
 * Motion (504 Outdated Optimize Dep), so no homepage script loaded.
 * @returns {import('astro').AstroIntegration}
 */
function devOnly() {
  return {
    name: 'portfolio:dev-only',
    hooks: {
      'astro:config:setup': ({ command, updateConfig, injectRoute }) => {
        if (command !== 'dev') return;
        updateConfig({ integrations: [keystatic()], vite: { cacheDir: 'node_modules/.vite-dev' } });
        injectRoute({ pattern: '/_system', entrypoint: './src/dev/system.astro' });
      },
    },
  };
}

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://vigneshdesigns.com',
  output: 'static',
  trailingSlash: 'ignore',
  // The floating toolbar covers the bottom of the page, where the footer bar and sheet live.
  devToolbar: { enabled: false },
  integrations: [
    mdx(),
    react(),
    sitemap({ filter: (page) => !page.includes('/_') }),
    devOnly(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
