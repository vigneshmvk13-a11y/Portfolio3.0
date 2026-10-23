#!/usr/bin/env node
/**
 * Enforces "tokens only" (AGENTS.md → Non-negotiables) across src/:
 * - no raw colours (hex, rgb(), hsl()) outside the token files;
 * - no arbitrary Tailwind values (p-[13px]) unless every value inside is a token var();
 *   the (--token) shorthand is always allowed;
 * - no spacing steps outside the approved scale (design/tokens.md → Spacing);
 * - no Tailwind default palette, radii or shadows;
 * - no inline style attributes with design values in markup.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const SRC = join(process.cwd(), 'src');
const EXTENSIONS = new Set(['.astro', '.ts', '.tsx', '.css', '.mdx', '.md']);
/** Token definition files may contain raw values. */
const TOKEN_FILES = new Set(['src/styles/global.css', 'src/styles/fonts.css']);
const ALLOWED_STEPS = new Set(['0', '0.5', '1', '2', '2.5', '3', '4', '5', '6', '8', '10', '12', '15', '20', '22', '25', '30', '40']);

const SPACING_PREFIX =
  '(?:-?(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left|start|end|w|h|size|min-w|min-h|max-w|max-h|translate-x|translate-y|scroll-m|scroll-p|basis))';
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const rules = [
  {
    name: 'raw colour',
    test: (line, file) =>
      !TOKEN_FILES.has(file) && /(?<![\w-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?|oklch)\(/.test(line),
  },
  {
    name: 'arbitrary value',
    test: (line) => {
      for (const match of line.matchAll(/(?<![\w$])([a-z][\w-]*)-\[([^\]\s]+)\]/g)) {
        const [, utility, inner] = match;
        // Property lists name CSS properties, not design values.
        if (/(?:^|:)(?:transition|will-change)$/.test(utility) && /^[a-z,-]+$/.test(inner)) continue;
        const onlyTokens = inner
          .split(/[_,]/)
          .every((part) => /^var\(--[\w-]+\)$/.test(part) || /^(?:\d+fr|auto|min-content|max-content)$/.test(part));
        if (!onlyTokens) return true;
      }
      return false;
    },
  },
  {
    name: 'off-scale spacing step',
    test: (line) => {
      const re = new RegExp(`(?<![\\w-])${SPACING_PREFIX}-(\\d+(?:\\.\\d+)?)(?![\\w./-])`, 'g');
      for (const match of line.matchAll(re)) {
        if (!ALLOWED_STEPS.has(match[1])) return true;
      }
      return false;
    },
  },
  {
    name: 'Tailwind default palette/radius/shadow',
    test: (line) =>
      new RegExp(`(?<![\\w-])(?:text|bg|border|ring|fill|stroke|outline|decoration|from|to|via)-(?:${PALETTE})-\\d{2,3}\\b`).test(line) ||
      /(?<![\w-])(?:rounded|shadow)-(?:xs|sm|md|lg|xl|2xl|3xl)\b/.test(line),
  },
  {
    name: 'inline style',
    test: (line, file) => file.endsWith('.astro') && /\sstyle=["{]/.test(line),
  },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(entry.name))) yield path;
  }
}

const problems = [];
for await (const path of walk(SRC)) {
  const file = relative(process.cwd(), path).replaceAll('\\', '/');
  const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('check-tokens-ignore')) return;
    for (const rule of rules) {
      if (rule.test(line, file)) problems.push(`${file}:${index + 1}  ${rule.name}: ${line.trim().slice(0, 140)}`);
    }
  });
}

if (problems.length > 0) {
  console.error(`check-tokens: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('Missing a value? Add it to design/tokens.md first, then global.css.');
  process.exit(1);
}
console.log('check-tokens: src/ uses tokens only.');
