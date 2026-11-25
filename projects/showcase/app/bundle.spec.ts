import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP = join(process.cwd(), 'projects/showcase/app');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '_generated' ? [] : sources(path);
    return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('the showcase main bundle', () => {
  it('has no namespace import of lucide, which keeps every icon in main', () => {
    const offenders = sources(APP).filter(file =>
      /import\s+\*\s+as\s+\w+\s+from\s+'lucide'/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('keeps ngx-mask out of the root providers', () => {
    expect(readFileSync(join(APP, 'app.config.ts'), 'utf8')).not.toContain('ngx-mask');
  });
});
