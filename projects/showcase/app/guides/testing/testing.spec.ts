import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const LIB = join(process.cwd(), 'projects/lib');
const GUIDE = join(process.cwd(), 'projects/showcase/app/guides/testing');

/** Every `ngwr/<name>/testing` the package publishes, as `<name>/testing`. */
function testingEntryPoints(): string[] {
  const manifest = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as { exports: Record<string, unknown> };
  return Object.keys(manifest.exports)
    .filter(key => key.endsWith('/testing'))
    .map(key => key.slice(2))
    .sort();
}

/** The harness classes an entry point declares. */
function harnessClasses(entry: string): string[] {
  const dir = join(LIB, entry);
  return readdirSync(dir)
    .filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
    .flatMap(file => [...readFileSync(join(dir, file), 'utf8').matchAll(/export class (Wr\w+Harness)\b/g)])
    .map(match => match[1]);
}

describe('the testing guide', () => {
  const page = ['testing.html', 'testing.ts'].map(file => readFileSync(join(GUIDE, file), 'utf8')).join('\n');

  it('names every harness entry point', () => {
    // The charts share one section, headed by the path pattern, so a chart
    // counts once the page names a harness class it publishes.
    const pattern = page.includes('ngwr/charts/<name>/testing');
    const entries = testingEntryPoints();
    const missing = entries.filter(entry => {
      if (page.includes(`ngwr/${entry}\``)) return false;
      return !(pattern && entry.startsWith('charts/') && harnessClasses(entry).some(name => page.includes(name)));
    });

    // A reader that matched nothing would report the guide as complete.
    expect(entries.length).toBeGreaterThan(10);
    expect(
      missing.map(entry => `ngwr/${entry}`),
      'harness entry points the testing guide does not name (projects/showcase/app/guides/testing)'
    ).toEqual([]);
  });
});
