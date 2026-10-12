import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildSandboxProject } from './project';
import type { SandboxFile } from './types';

/**
 * What the generated project installs, read off the `package.json` it ships.
 *
 * The root manifest is read from disk here rather than through the import
 * `project.ts` uses, so the assertion compares the emitted range against the
 * file a Dependabot bump edits, not against the same binding twice.
 */
const ROOT_LUCIDE = (
  JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    devDependencies: Record<string, string>;
  }
).devDependencies['lucide'];

const html = (code: string): SandboxFile[] => [{ label: 'HTML', language: 'html', code }];

const dependenciesOf = (files: readonly SandboxFile[]): Record<string, string> =>
  (
    JSON.parse(buildSandboxProject('Sandbox spec', files).files['package.json']) as {
      dependencies: Record<string, string>;
    }
  ).dependencies;

describe('the sandbox lucide range', () => {
  it('is the range the root package.json declares', () => {
    expect(ROOT_LUCIDE).toMatch(/\d/);
    expect(dependenciesOf(html('<wr-icon name="search" />'))['lucide']).toBe(ROOT_LUCIDE);
  });

  it('reaches a snippet that draws its icon through a button', () => {
    expect(dependenciesOf(html('<button wr-btn icon="search">Find</button>'))['lucide']).toBe(ROOT_LUCIDE);
  });

  it('is left out when the snippet draws no icon', () => {
    expect(dependenciesOf(html('<wr-alert>Saved</wr-alert>'))).not.toHaveProperty('lucide');
  });

  it('ships the icon barrel beside it', () => {
    const project = buildSandboxProject('Sandbox spec', html('<wr-icon name="search" />'));

    expect(project.kind).toBe('template');
    expect(project.files['src/app/icons.ts']).toContain("from 'lucide'");
  });
});
