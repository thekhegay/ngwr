import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeNode } from './types';

const NODES: readonly WrTreeNode[] = [
  { id: 'src', label: 'src', children: [{ id: 'main', label: 'main.ts' }] },
  { id: 'off', label: 'off', disabled: true, children: [{ id: 'hid', label: 'hidden.ts' }] },
  { id: 'remote', label: 'remote', hasChildren: true },
  { id: 'leaf', label: 'leaf.txt' },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      [nodes]="nodes"
      [selectionMode]="mode()"
      [cascade]="cascade()"
      [draggable]="draggable()"
      [expandOnClick]="expandOnClick()"
      [loadChildren]="loader"
      [(expanded)]="expanded"
      [(selected)]="selected"
    />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly mode = signal<'none' | 'single' | 'multi'>('single');
  readonly cascade = signal(false);
  readonly draggable = signal(false);
  readonly expandOnClick = signal(true);
  readonly expanded = signal<readonly string[]>([]);
  readonly selected = signal<readonly string[]>([]);
  readonly loader = vi.fn(() => Promise.resolve([{ id: 'r1', label: 'One' }] as readonly WrTreeNode[]));
}

@Component({
  imports: [WrTree],
  template: `<wr-tree
    openOn="overlay"
    [nodes]="nodes"
    [selectionMode]="mode()"
    [cascade]="true"
    [(expanded)]="expanded"
  />`,
})
class OverlayHost {
  readonly nodes = NODES;
  readonly mode = signal<'single' | 'multi'>('multi');
  readonly expanded = signal<readonly string[]>([]);
}

describe('WrTree expandOnClick', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const row = (label: string): HTMLElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-tree__row')].find(
      r => r.querySelector('.wr-tree__label')!.textContent.trim() === label
    )!;
  const click = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const mount = (setup?: (h: Host) => void): void => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    setup?.(host);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('toggles a branch from a click on its row', () => {
    mount();
    click(row('src'));
    expect(host.expanded()).toEqual(['src']);
    click(row('src'));
    expect(host.expanded()).toEqual([]);
  });

  it('loads lazy children on a row click', async () => {
    mount();
    click(row('remote'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.loader).toHaveBeenCalledTimes(1);
    expect(row('One')).toBeTruthy();
  });

  it('opens and selects a parent in single selection', () => {
    mount();
    click(row('src'));
    expect(host.expanded()).toEqual(['src']);
    expect(host.selected()).toEqual(['src']);
  });

  it('leaves a leaf as it was: it selects and nothing opens', () => {
    mount();
    click(row('leaf.txt'));
    expect(host.expanded()).toEqual([]);
    expect(host.selected()).toEqual(['leaf']);
  });

  it('does not toggle a disabled node', () => {
    mount();
    click(row('off'));
    expect(host.expanded()).toEqual([]);
  });

  it('does not toggle twice from the arrow', () => {
    mount();
    click(row('src').querySelector('.wr-tree__toggle')!);
    expect(host.expanded()).toEqual(['src']);
  });

  it('only checks from the box, and only opens from the rest of the row, under cascade', () => {
    mount(h => {
      h.mode.set('multi');
      h.cascade.set(true);
    });
    click(row('src').querySelector('.wr-tree__check')!);
    expect(host.selected()).toContain('src');
    expect(host.expanded()).toEqual([]);
    click(row('src').querySelector('.wr-tree__label')!);
    expect(host.expanded()).toEqual(['src']);
    expect(host.selected()).toContain('src');
    click(row('src').querySelector('.wr-tree__label')!);
    expect(host.expanded()).toEqual([]);
  });

  it('does not open a branch when a drag starts on it', () => {
    mount(h => h.draggable.set(true));
    row('src').dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(host.expanded()).toEqual([]);
  });

  it('keeps the old behaviour with expandOnClick off', () => {
    mount(h => h.expandOnClick.set(false));
    click(row('src'));
    expect(host.expanded()).toEqual([]);
    expect(host.selected()).toEqual(['src']);
    click(row('src').querySelector('.wr-tree__toggle')!);
    expect(host.expanded()).toEqual(['src']);
  });
});

describe('WrTree expandOnClick in the overlay panel', () => {
  it('opens a branch without closing the panel or committing', () => {
    const fixture = TestBed.createComponent(OverlayHost);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!.click();
    fixture.detectChanges();
    const label = [...document.querySelectorAll<HTMLElement>('.wr-tree__label')].find(
      l => l.textContent.trim() === 'src'
    )!;
    label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toEqual(['src']);
    expect(document.querySelector('[role="tree"]')).not.toBeNull();
    expect(document.querySelector('.wr-tree__row--selected')).toBeNull();
    fixture.destroy();
  });
});
