import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeFilterFn, WrTreeNode } from './types';

const NODES: readonly WrTreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'app',
        label: 'app',
        children: [
          { id: 'main', label: 'main.ts' },
          { id: 'routes', label: 'routes.ts' },
        ],
      },
      { id: 'styles', label: 'styles.css' },
    ],
  },
  { id: 'docs', label: 'docs', children: [{ id: 'guide', label: 'Main guide.md' }] },
  { id: 'readme', label: 'README.md' },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree ariaLabel="Files" [nodes]="nodes" [(expanded)]="expanded" [filter]="filter()" [filterFn]="filterFn()" />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly expanded = signal<readonly string[]>([]);
  readonly filter = signal<string | null>('');
  readonly filterFn = signal<WrTreeFilterFn | null>(null);
}

describe('WrTree filter', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-tree__row'));
  const labels = (): string[] => rows().map(row => row.querySelector('.wr-tree__label')!.textContent.trim());
  const row = (label: string): HTMLElement => rows()[labels().indexOf(label)];
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const type = async (text: string | null): Promise<void> => {
    host.filter.set(text);
    await settle();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => fixture.destroy());

  it('shows every root, collapsed, with no filter', () => {
    expect(labels()).toEqual(['src', 'docs', 'README.md']);
    expect(root().querySelector('mark')).toBeNull();
  });

  it('keeps the matches and their ancestors, and opens the ancestors', async () => {
    await type('main');

    expect(labels()).toEqual(['src', 'app', 'main.ts', 'docs', 'Main guide.md']);
    expect(row('src').getAttribute('aria-expanded')).toBe('true');
    expect(row('app').getAttribute('aria-expanded')).toBe('true');
    // `expanded` is the user's own tree and the filter never writes to it.
    expect(host.expanded()).toEqual([]);
  });

  it('counts a row among the siblings that are showing', async () => {
    await type('main');

    expect(row('main.ts').getAttribute('aria-setsize')).toBe('1');
    expect(row('docs').getAttribute('aria-posinset')).toBe('2');
    expect(row('docs').getAttribute('aria-setsize')).toBe('2');
  });

  it('highlights the match, whatever its case', async () => {
    await type('MAIN');

    expect(row('main.ts').querySelector('mark')!.textContent).toBe('main');
    expect(row('Main guide.md').querySelector('mark')!.textContent).toBe('Main');
    expect(row('src').querySelector('mark')).toBeNull();
  });

  it('shows a matching branch as a leaf when nothing below it matches', async () => {
    await type('app');

    expect(labels()).toEqual(['src', 'app']);
    expect(row('app').hasAttribute('aria-expanded')).toBe(false);
  });

  it('renders no row when nothing matches, and ignores a filter of spaces', async () => {
    await type('zzz');
    expect(labels()).toEqual([]);

    await type('   ');
    expect(labels()).toEqual(['src', 'docs', 'README.md']);

    await type(null);
    expect(labels()).toEqual(['src', 'docs', 'README.md']);
  });

  it('restores the expansion the user had when the filter is cleared', async () => {
    host.expanded.set(['docs']);
    await settle();
    expect(labels()).toEqual(['src', 'docs', 'Main guide.md', 'README.md']);

    await type('routes');
    expect(labels()).toEqual(['src', 'app', 'routes.ts']);

    await type('');
    expect(labels()).toEqual(['src', 'docs', 'Main guide.md', 'README.md']);
    expect(host.expanded()).toEqual(['docs']);
  });

  it('lets the user close a result branch without touching `expanded`, and forgets it on new text', async () => {
    host.expanded.set(['src']);
    await type('main');

    row('src').querySelector<HTMLElement>('button.wr-tree__toggle')!.click();
    await settle();
    expect(labels()).toEqual(['src', 'docs', 'Main guide.md']);
    expect(row('src').getAttribute('aria-expanded')).toBe('false');
    expect(host.expanded()).toEqual(['src']);

    await type('main.');
    expect(labels()).toEqual(['src', 'app', 'main.ts']);

    await type('');
    expect(labels()).toEqual(['src', 'app', 'styles.css', 'docs', 'README.md']);
  });

  it('matches through `filterFn` when one is given', async () => {
    host.filterFn.set((node, query) => node.id.startsWith(query));
    await type('ro');

    expect(labels()).toEqual(['src', 'app', 'routes.ts']);
  });
});
