import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeNode } from './types';

@Component({
  imports: [WrTree],
  template: `<wr-tree ariaLabel="Files" [nodes]="nodes()" [filter]="filter()" [noMatchesLabel]="label()" />`,
})
class Host {
  readonly nodes = signal<readonly WrTreeNode[]>([{ id: 'a', label: 'alpha' }]);
  readonly filter = signal('');
  readonly label = signal<string | null>(null);
}

@Component({
  imports: [WrTree],
  template: `<wr-tree openOn="overlay" [nodes]="[{ id: 'a', label: 'alpha' }]" filter="zzz" />`,
})
class OverlayHost {}

describe('WrTree empty state for a filter', () => {
  let fixture: ComponentFixture<Host>;
  const empty = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('wr-empty');
  const set = async (fn: (h: Host) => void): Promise<void> => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => fixture.destroy());

  it('shows wr-empty only when the filter matches nothing', async () => {
    fixture = TestBed.createComponent(Host);
    await set(() => undefined);
    expect(empty()).toBeNull();
    await set(h => h.filter.set('zzz'));
    expect(empty()!.textContent).toContain('No results');
    await set(h => h.filter.set('alp'));
    expect(empty()).toBeNull();
  });

  it('takes the text from noMatchesLabel', async () => {
    fixture = TestBed.createComponent(Host);
    await set(h => {
      h.filter.set('zzz');
      h.label.set('Nothing here');
    });
    expect(empty()!.textContent).toContain('Nothing here');
  });

  it('stays out of the way of a tree with no nodes and no filter', async () => {
    fixture = TestBed.createComponent(Host);
    await set(h => h.nodes.set([]));
    expect(empty()).toBeNull();
  });

  it('shows in the overlay panel too', () => {
    const f = TestBed.createComponent(OverlayHost);
    f.detectChanges();
    (f.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!.click();
    f.detectChanges();
    expect(document.querySelector('wr-empty')).not.toBeNull();
    f.destroy();
  });
});
