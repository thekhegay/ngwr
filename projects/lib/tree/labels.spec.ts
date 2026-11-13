import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeNode } from './types';

type Labels = Partial<Record<'clearSelectionLabel' | 'expandLabel' | 'collapseLabel', string>>;

const CUSTOM: Labels = {
  clearSelectionLabel: 'x-clearSelectionLabel',
  expandLabel: 'x-expandLabel',
  collapseLabel: 'x-collapseLabel',
};

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      data-k="overlay"
      openOn="overlay"
      [nodes]="nodes"
      value="a"
      [clearSelectionLabel]="labels().clearSelectionLabel ?? null"
    />
    <wr-tree
      data-k="inline"
      ariaLabel="Folders"
      [nodes]="nodes"
      [expanded]="['a']"
      [expandLabel]="labels().expandLabel ?? null"
      [collapseLabel]="labels().collapseLabel ?? null"
    />
  `,
})
class Host {
  readonly labels = signal<Labels>({});
  readonly nodes: readonly WrTreeNode[] = [
    { id: 'a', label: 'Open', children: [{ id: 'a1', label: 'Leaf' }] },
    { id: 'b', label: 'Closed', children: [{ id: 'b1', label: 'Leaf' }] },
  ];
}

describe('WrTree per-instance labels', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (russian = false): Promise<void> => {
    TestBed.configureTestingModule({
      providers: russian
        ? [provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]
        : [],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const set = async (labels: Labels): Promise<void> => {
    fixture.componentInstance.labels.set(labels);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => TestBed.resetTestingModule());

  const read = (): Promise<Labels> => {
    const toggles = [
      ...root().querySelectorAll<HTMLElement>('[data-k="inline"] .wr-tree__toggle:not(.wr-tree__toggle--leaf)'),
    ].map(el => el.getAttribute('aria-label') ?? '');
    return Promise.resolve({
      clearSelectionLabel: root().querySelector('[data-k="overlay"] .wr-tree__clear')?.getAttribute('aria-label') ?? '',
      // `a` is expanded, so its toggle collapses; `b` is collapsed, so its toggle expands.
      expandLabel: toggles[1],
      collapseLabel: toggles[0],
    });
  };

  it('prints each input in place of its built-in string', async () => {
    await mount();
    await set(CUSTOM);

    expect(await read()).toEqual({
      clearSelectionLabel: 'x-clearSelectionLabel',
      expandLabel: 'x-expandLabel',
      collapseLabel: 'x-collapseLabel',
    });
  });

  it('falls back to the built-in English with every input null', async () => {
    await mount();

    expect(await read()).toEqual({
      clearSelectionLabel: 'Clear selection',
      expandLabel: 'Expand',
      collapseLabel: 'Collapse',
    });
  });

  it('keeps a registered catalog under a null input, and an input over the catalog', async () => {
    await mount(true);

    expect(await read()).toEqual({
      clearSelectionLabel: 'Очистить выбор',
      expandLabel: 'Развернуть',
      collapseLabel: 'Свернуть',
    });

    await set({ clearSelectionLabel: 'x-clearSelectionLabel' });

    expect(await read()).toEqual({
      clearSelectionLabel: 'x-clearSelectionLabel',
      expandLabel: 'Развернуть',
      collapseLabel: 'Свернуть',
    });
  });
});
