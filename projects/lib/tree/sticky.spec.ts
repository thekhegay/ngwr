import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it } from 'vitest';

import { treeRowSpans, treeStickyChain } from './sticky-chain';
import { WrTree } from './tree';
import type { WrTreeNode } from './types';

/**
 * 0 a          depth 0
 * 1   a1       depth 1
 * 2     a1x    depth 2
 * 3     a1y    depth 2
 * 4   a2       depth 1
 * 5 b          depth 0
 * 6   b1       depth 1
 * 7 c          depth 0
 */
const DEPTHS = [0, 1, 2, 2, 1, 0, 1, 0].map(depth => ({ depth }));

describe('treeRowSpans', () => {
  it('finds the parent and the last row of each open subtree', () => {
    const spans = treeRowSpans(DEPTHS);
    expect(spans.map(s => s.parent)).toEqual([-1, 0, 1, 1, 0, -1, 5, -1]);
    expect(spans.map(s => s.end)).toEqual([4, 3, 2, 3, 4, 6, 6, 7]);
  });
});

describe('treeStickyChain', () => {
  const spans = treeRowSpans(DEPTHS);
  const chain = (offset: number, max = 5): readonly { index: number; top: number }[] =>
    treeStickyChain(spans, offset, 20, max);

  it('pins nothing at rest', () => {
    expect(chain(0)).toEqual([]);
    expect(chain(-4)).toEqual([]);
  });

  it('pins a branch once it has scrolled under, and the branches nested at its top with it', () => {
    expect(chain(2)).toEqual([
      { index: 0, top: 0 },
      { index: 1, top: 20 },
    ]);
  });

  it('does not pin a row that sits in its slot, give or take a pixel', () => {
    expect(chain(1)).toEqual([]);
    expect(treeStickyChain(spans, 20, 20, 1)).toEqual([{ index: 0, top: 0 }]);
    // Row 5 lands at the top: the branch above has gone, and row 5 is not under yet.
    expect(chain(99.5)).toEqual([]);
    expect(chain(100)).toEqual([]);
    expect(chain(101)).toEqual([]);
  });

  it('keeps one row per level, outermost first', () => {
    expect(chain(30).map(p => p.index)).toEqual([0, 1]);
  });

  it('pushes the deepest pinned row out with the last row of its subtree', () => {
    // Offset 30: slot 1 spans 50..70, and a1's subtree ends at 80.
    expect(chain(30)[1]).toEqual({ index: 1, top: 20 });
    // Offset 45: the subtree ends at 80, 35px down, so the 20px row rides up to 15.
    expect(chain(45)).toEqual([
      { index: 0, top: 0 },
      { index: 1, top: 15 },
    ]);
  });

  it('drops a pinned row when the next row reaches its slot, and pushes the outer one in turn', () => {
    // Offset 60: row 4 (a leaf of `a`) is in slot 1, nothing to pin there.
    expect(chain(60)).toEqual([{ index: 0, top: 0 }]);
    // Offset 90: `a` ends at 100, so its row is half way out.
    expect(chain(90)).toEqual([{ index: 0, top: -10 }]);
    expect(chain(102)).toEqual([{ index: 5, top: 0 }]);
  });

  it('caps the stack at `max`, keeping the outermost levels', () => {
    expect(chain(30, 1)).toEqual([{ index: 0, top: 0 }]);
    expect(chain(30, 0)).toEqual([]);
  });

  it('pins nothing over a leaf or a closed branch', () => {
    expect(chain(141)).toEqual([]);
  });
});

const tree = (): WrTreeNode[] =>
  Array.from({ length: 4 }, (_, g) => ({
    id: `g${g}`,
    label: `Group ${g}`,
    children: [
      {
        id: `g${g}-sub`,
        label: `Sub ${g}`,
        children: Array.from({ length: 30 }, (_, i) => ({ id: `g${g}-${i}`, label: `Item ${g}.${i}` })),
      },
      { id: `g${g}-tail`, label: `Tail ${g}` },
    ],
  }));

@Component({
  imports: [WrTree],
  template: `<wr-tree
    virtualScroll
    selectionMode="none"
    [stickyParents]="sticky()"
    [rowHeight]="20"
    [viewportHeight]="200"
    [nodes]="nodes"
    [(expanded)]="expanded"
  />`,
})
class Host {
  readonly nodes = tree();
  readonly sticky = signal(true);
  readonly expanded = signal<readonly string[]>(this.nodes.flatMap(n => [n.id, `${n.id}-sub`]));
}

@Component({
  imports: [WrTree],
  template: `<wr-tree
    virtualScroll
    stickyParents
    [rowHeight]="20"
    [viewportHeight]="60"
    [nodes]="nodes"
    [expanded]="expanded"
  />`,
})
class ShortHost {
  readonly nodes = tree();
  readonly expanded = this.nodes.flatMap(n => [n.id, `${n.id}-sub`]);
}

describe('WrTree sticky parents', () => {
  let fixture: ComponentFixture<Host | ShortHost>;
  const host = (): Host => fixture.componentInstance as Host;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => el().querySelector<HTMLElement>('.wr-tree__list')!;
  const pins = (): HTMLElement[] => Array.from(el().querySelectorAll<HTMLElement>('.wr-tree__sticky-row'));
  const pinned = (): string[] => pins().map(p => p.textContent.trim());
  const active = (): string | undefined => el().querySelector('.wr-tree__row--active')?.textContent?.trim();

  /** The list's scroll offset, held by the test: no layout is needed to read it back. */
  let offset = 0;

  const mount = async (sticky = true, short = false): Promise<void> => {
    fixture = short ? TestBed.createComponent(ShortHost) : TestBed.createComponent(Host);
    if (!short) host().sticky.set(sticky);
    fixture.detectChanges();
    await Promise.resolve();
    offset = 0;
    const ul = list();
    Object.defineProperty(ul, 'scrollTop', { configurable: true, get: () => offset, set: (v: number) => (offset = v) });
    ul.scrollTo = ((options: ScrollToOptions) => {
      offset = options.top ?? 0;
    }) as typeof ul.scrollTo;
    fixture.detectChanges();
  };

  const scrollTo = (top: number): void => {
    offset = top;
    list().dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('is off by default: no anchor, no pinned row', async () => {
    await mount(false);
    scrollTo(300);
    await new Promise(resolve => requestAnimationFrame(resolve));
    fixture.detectChanges();

    expect(el().querySelector('.wr-tree__sticky')).toBeNull();
    expect(pins()).toEqual([]);
  });

  it('pins nothing at rest', async () => {
    await mount();
    expect(el().querySelector('.wr-tree__sticky')).not.toBeNull();
    expect(pins()).toEqual([]);
  });

  it('pins the open ancestors of the top row, outermost first', async () => {
    await mount();
    scrollTo(300);

    expect(pinned()).toEqual(['Group 0', 'Sub 0']);
    expect(pins().map(p => p.style.getPropertyValue('--wr-tree-depth'))).toEqual(['0', '1']);
  });

  it('hands the stack over to the next branch', async () => {
    await mount();
    // Group 0 is 33 rows, 660px: its tail is under the first slot.
    scrollTo(650);
    expect(pinned()).toEqual(['Group 0']);
    expect(pins()[0].style.transform).toBe('translateY(-10px)');

    scrollTo(700);
    expect(pinned()).toEqual(['Group 1', 'Sub 1']);
  });

  it('keeps the copy out of the accessibility tree and out of the tab order', async () => {
    await mount();
    scrollTo(300);

    const anchor = el().querySelector<HTMLElement>('.wr-tree__sticky')!;
    expect(anchor.getAttribute('aria-hidden')).toBe('true');
    expect(anchor.getAttribute('role')).toBe('presentation');
    expect(anchor.querySelectorAll('[tabindex], button, a, input, [role="treeitem"], [id]').length).toBe(0);
    // The real rows are still the tree.
    expect(el().querySelectorAll('[role="treeitem"]').length).toBeGreaterThan(0);
  });

  it('goes to the real row on a click and puts the cursor on it', async () => {
    await mount();
    scrollTo(300);

    pins()[1].querySelector<HTMLElement>('.wr-tree__label')!.click();
    fixture.detectChanges();

    // `Sub 0` is row 1, one pinned ancestor above it: it lands in the second slot.
    expect(offset).toBe(0);
    expect(active()).toBe('Sub 0');
    expect(host().expanded()).toContain('g0-sub');

    scrollTo(900);
    expect(pinned()).toEqual(['Group 1', 'Sub 1']);
    pins()[1].querySelector<HTMLElement>('.wr-tree__label')!.click();
    fixture.detectChanges();

    // Row 34, under its one ancestor: 33 rows up.
    expect(offset).toBe(660);
    expect(active()).toBe('Sub 1');
  });

  it('collapses the branch from the pinned arrow and leaves its row at the top', async () => {
    await mount();
    scrollTo(900);

    pins()[1].querySelector<HTMLElement>('.wr-tree__toggle')!.click();
    fixture.detectChanges();

    expect(host().expanded()).not.toContain('g1-sub');
    expect(offset).toBe(660);
    // `Group 1` sits exactly at the top, so the real rows are the picture.
    expect(pinned()).toEqual([]);
    const rows = Array.from(el().querySelectorAll<HTMLElement>('.wr-tree__row'));
    expect(rows.find(r => r.getAttribute('data-tree-index') === '34')?.textContent?.trim()).toBe('Sub 1');
  });

  it('scrolls the cursor clear of the stack when it moves up under it', async () => {
    await mount();
    // The cursor goes to `Item 0.10`, row 12, then the list scrolls on past it.
    scrollTo(200);
    el().querySelector<HTMLElement>('[data-tree-index="12"]')!.click();
    fixture.detectChanges();
    expect(active()).toBe('Item 0.10');
    // Row 12 sits at 240..260; at offset 210 the two pinned rows cover 210..250.
    scrollTo(210);

    list().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();

    expect(active()).toBe('Item 0.9');
    // Row 11 at 220, two pinned rows above it: 220 - 40.
    expect(offset).toBe(180);
    expect(pinned()).toEqual(['Group 0', 'Sub 0']);
  });

  it('caps the stack at a third of the viewport', async () => {
    await mount();
    scrollTo(300);
    expect(pins().length).toBe(2);

    // 200px of viewport and 20px rows leave room for three; a 60px one for one.
    fixture.destroy();
    await mount(true, true);
    scrollTo(300);
    expect(pinned()).toEqual(['Group 0']);
  });
});
