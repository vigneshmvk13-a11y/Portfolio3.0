#!/usr/bin/env node
/**
 * Fails when any file under public/media is larger than 5 MB (AGENTS.md → Media rules).
 * Reports every hit; never re-encodes.
 */
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/media/', import.meta.url));
const LIMIT = 5 * 1024 * 1024;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const tooLarge = [];
let count = 0;
for await (const file of walk(root)) {
  count += 1;
  const { size } = await stat(file);
  if (size > LIMIT) tooLarge.push({ file: relative(process.cwd(), file), mb: (size / 1024 / 1024).toFixed(2) });
}

if (tooLarge.length > 0) {
  console.error(`check-media: ${tooLarge.length} file(s) over 5 MB:`);
  for (const { file, mb } of tooLarge) console.error(`  ${file}  ${mb} MB`);
  console.error('Report these to Vignesh; do not re-encode silently.');
  process.exit(1);
}
console.log(`check-media: ${count} file(s) in public/media, all ≤ 5 MB.`);
