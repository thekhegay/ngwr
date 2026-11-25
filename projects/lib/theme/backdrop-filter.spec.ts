import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(join(process.cwd(), 'projects/lib', path), 'utf8');

describe('backdrop filter hooks', () => {
  it('declares the shared token beside the overlay timing', () => {
    expect(read('theme/styles/_variables.scss')).toContain('--wr-overlay-backdrop-filter: blur(2px);');
  });

  it.each([
    ['dialog/styles/_index.scss', '--wr-dialog-backdrop-filter'],
    ['drawer/styles/_index.scss', '--wr-drawer-backdrop-filter'],
    ['table/styles/_index.scss', '--wr-table-loading-backdrop-filter'],
  ])('%s blurs through %s, defaulting to the shared token', (file, hook) => {
    const css = read(file);
    expect(css).toContain(`${hook}: var(--wr-overlay-backdrop-filter);`);
    expect(css).toContain(`backdrop-filter: var(${hook});`);
  });

  it('keeps the command palette blur at its own value behind its own hook', () => {
    const css = read('command-palette/styles/_index.scss');
    expect(css).toContain('--wr-command-palette-backdrop-filter: blur(4px);');
    expect(css).toContain('backdrop-filter: var(--wr-command-palette-backdrop-filter);');
  });
});
