import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { render } from 'svelte/server';

const pages = import.meta.glob('/src/routes/kb/**/+page.svx', { eager: true });

for (const [source, page] of Object.entries(pages)) {
  const route = source.replace('/src/routes/', '').replace('/+page.svx', '');
  const target = resolve('rendered', route, 'index.html');
  const { head, body } = render(page.default);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>\n`,
  );
  console.log(`${source} -> ${target}`);
}
