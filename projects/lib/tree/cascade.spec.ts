import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeChildrenLoader, WrTreeNode, WrTreeSelectionMode } from './types';

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
      { id: 'lock', label: 'lock.json', disabled: true },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'remote', label: 'Remote', hasChildren: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      [nodes]="nodes"
      [expanded]="['src', 'app']"
      [selectionMode]="mode()"
      [cascade]="cascade()"
      [loadChildren]="loader"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly mode = signal<WrTreeSelectionMode>('multi');
  readonly cascade = signal(true);
  readonly value = signal<unknown>(undefined);
  readonly loader: WrTreeChildrenLoader = () =>
    Promise.resolve([
      { id: 'r1', label: 'One' },
      { id: 'r2', label: 'Two' },
    ]);
}

describe('WrTree cascading checks', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-tree__row'));
  const labels = (): string[] => rows().map(row => row.querySelector('.wr-tree__label')!.textContent.trim());
  const row = (label: string): HTMLElement => rows()[labels().indexOf(label)];
  const checked = (label: string): string | null => row(label).getAttribute('aria-checked');
  const value = (): string[] => [...(host.value() as readonly string[])].sort();
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const click = async (label: string): Promise<void> => {
    row(label).click();
    await settle();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => fixture.destroy());

  it("keeps today's rows when `cascade` is off: no box, `aria-selected`, a click replaces", async () => {
    host.cascade.set(false);
    await settle();

    expect(root().querySelector('.wr-tree__check')).toBeNull();
    expect(row('src').hasAttribute('aria-checked')).toBe(false);
    expect(row('src').getAttribute('aria-selected')).toBe('false');

    await click('src');
    await click('README.md');
    expect(host.value()).toEqual(['readme']);
  });

  it('does nothing outside multi mode', async () => {
    host.mode.set('single');
    await settle();

    expect(root().querySelector('.wr-tree__check')).toBeNull();
    expect(row('src').hasAttribute('aria-checked')).toBe(false);
  });

  it('draws a box on every row and announces `aria-checked` in place of `aria-selected`', () => {
    expect(root().querySelectorAll('.wr-tree__check')).toHaveLength(rows().length);
    for (const item of rows()) {
      expect(item.getAttribute('aria-checked')).toBe('false');
      expect(item.hasAttribute('aria-selected')).toBe(false);
    }
  });

  it('checks a parent together with its enabled descendants, and the value holds all of them', async () => {
    await click('src');

    expect(checked('src')).toBe('true');
    expect(checked('app')).toBe('true');
    expect(checked('main.ts')).toBe('true');
    expect(checked('routes.ts')).toBe('true');
    expect(checked('styles.css')).toBe('true');
    // A disabled node keeps its own state.
    expect(checked('lock.json')).toBe('false');
    expect(value()).toEqual(['app', 'main', 'routes', 'src', 'styles']);
    expect(row('src').querySelector('.wr-tree__check')!.classList).toContain('wr-checkbox--checked');
  });

  it('adds to the checks on a plain click, with no modifier', async () => {
    await click('main.ts');
    await click('README.md');

    expect(value()).toEqual(['main', 'readme']);
  });

  it('reads mixed on every ancestor of a partial check, and keeps them out of the value', async () => {
    await click('main.ts');

    expect(checked('main.ts')).toBe('true');
    expect(checked('app')).toBe('mixed');
    expect(checked('src')).toBe('mixed');
    expect(row('app').classList).toContain('wr-tree__row--mixed');
    const box = row('app').querySelector('.wr-tree__check')!;
    expect(box.classList).toContain('wr-checkbox--indeterminate');
    expect(box.querySelector('.wr-checkbox__dash')).not.toBeNull();
    expect(value()).toEqual(['main']);
  });

  it('checks a parent once its last enabled child is checked', async () => {
    await click('main.ts');
    await click('routes.ts');

    expect(checked('app')).toBe('true');
    expect(checked('src')).toBe('mixed');

    await click('styles.css');
    // `lock.json` is disabled and does not hold its parent back.
    expect(checked('src')).toBe('true');
    expect(value()).toEqual(['app', 'main', 'routes', 'src', 'styles']);
  });

  it('unchecks a parent with its descendants, and unchecking one child leaves the parent mixed', async () => {
    await click('src');
    await click('main.ts');

    expect(checked('main.ts')).toBe('false');
    expect(checked('app')).toBe('mixed');
    expect(checked('src')).toBe('mixed');
    expect(value()).toEqual(['routes', 'styles']);

    await click('src');
    await click('src');
    expect(value()).toEqual([]);
    expect(checked('app')).toBe('false');
  });

  it('toggles from the keyboard too', async () => {
    const list = root().querySelector<HTMLElement>('.wr-tree__list')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await settle();

    expect(checked('src')).toBe('true');
    expect(checked('main.ts')).toBe('true');
  });

  it('checks children that load under a checked parent', async () => {
    await click('Remote');
    expect(value()).toEqual(['remote']);

    row('Remote').querySelector<HTMLElement>('button.wr-tree__toggle')!.click();
    await settle();

    expect(labels()).toContain('One');
    expect(checked('One')).toBe('true');
    expect(checked('Two')).toBe('true');
    expect(value()).toEqual(['r1', 'r2', 'remote']);
  });

  it('takes a value written from outside as it is and derives the mixed state from it', async () => {
    host.value.set(['routes']);
    await settle();

    expect(checked('routes.ts')).toBe('true');
    expect(checked('app')).toBe('mixed');
    expect(checked('src')).toBe('mixed');
    expect(checked('README.md')).toBe('false');
  });
});
