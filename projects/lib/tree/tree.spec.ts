import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTreeNode, WrTreeSelectionMode } from './interfaces';
import { WrTree } from './tree';

@Component({
  imports: [WrTree],
  template: `<wr-tree openOn="overlay" [nodes]="[]" />`,
})
class PlaceholderHost {}

@Component({
  imports: [WrTree],
  template: `<wr-tree openOn="overlay" [nodes]="[]" placeholder="Pick a folder" />`,
})
class BoundPlaceholderHost {}

const NODES: readonly WrTreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'app', label: 'app', children: [{ id: 'main.ts', label: 'main.ts' }] },
      { id: 'styles.css', label: 'styles.css' },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'locked', label: 'node_modules', disabled: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      [nodes]="nodes()"
      [(selected)]="picked"
      [(expanded)]="expanded"
      [selectionMode]="selectionMode()"
      [disabled]="disabled()"
    />
  `,
})
class Host {
  readonly nodes = signal(NODES);
  // Inline mode drives selection through `[(selected)]`; `[(value)]` is the
  // form-control binding and is documented as meaningful in `overlay` mode.
  readonly picked = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly selectionMode = signal<WrTreeSelectionMode>('single');
  readonly disabled = signal(false);
}

@Component({
  imports: [WrTree],
  template: `<wr-tree openOn="overlay" [nodes]="nodes()" [(value)]="picked" placeholder="Pick a file" />`,
})
class OverlayHost {
  readonly nodes = signal(NODES);
  readonly picked = signal<unknown>(undefined);
}

/**
 * A tree is ONE tab stop with a roving cursor inside it: the `role="tree"` owns
 * focus and routes the arrows, and each row carries the depth and expanded
 * state a screen reader reads out. Rendered without `aria-level` /
 * `aria-expanded` it becomes a flat list of names with no structure — identical
 * on screen, meaningless to anyone not looking at it.
 *
 * `openOn` defaults to `inline`, so the rows live in the fixture. The overlay
 * shape is a separate block at the bottom, where the panel mounts into the CDK
 * container instead.
 */
describe('WrTree', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('[role="tree"]')!;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const labels = (): string[] => rows().map(r => r.textContent.replace(/\s+/g, ' ').trim());
  const picked = (): readonly string[] => fixture.componentInstance.picked();

  const click = (index: number): void => {
    rows()[index].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  /** Expanding is the TOGGLE's job — a click on the row selects instead. */
  const toggle = (index: number): void => {
    rows()[index].querySelector<HTMLButtonElement>('.wr-tree__toggle')!.click();
    fixture.detectChanges();
  };

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    list().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a tree of the roots until something is expanded', () => {
    expect(list()).not.toBeNull();
    expect(labels()).toEqual(['src', 'README.md', 'node_modules']);
  });

  it('gives every row its depth, so the structure survives being read aloud', () => {
    expect(rows().map(r => r.getAttribute('aria-level'))).toEqual(['1', '1', '1']);
  });

  it('says which rows can expand, and leaves leaves alone', () => {
    // A parent with no `aria-expanded` announces as a leaf and the user never
    // learns there is anything under it.
    expect(rows()[0].getAttribute('aria-expanded')).toBe('false');
    expect(rows()[1].getAttribute('aria-expanded')).toBeNull();
  });

  it('expands a branch and deepens the level of what appears', () => {
    toggle(0);

    expect(labels()).toEqual(['src', 'app', 'styles.css', 'README.md', 'node_modules']);
    expect(rows()[0].getAttribute('aria-expanded')).toBe('true');
    expect(rows()[1].getAttribute('aria-level')).toBe('2');
  });

  it('collapses it again', () => {
    toggle(0);
    toggle(0);

    expect(labels()).toEqual(['src', 'README.md', 'node_modules']);
  });

  it('selects a leaf and reports it through the two-way binding', () => {
    click(1);

    expect(picked()).toEqual(['readme']);
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('marks only the selected row', () => {
    click(1);

    expect(rows().filter(r => r.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });

  it('refuses a disabled node', () => {
    click(2);

    expect(picked()).toEqual([]);
  });

  it('announces multi-select on the tree, and collects ids', () => {
    fixture.componentInstance.selectionMode.set('multi');
    fixture.detectChanges();

    expect(list().getAttribute('aria-multiselectable')).toBe('true');

    click(1);
    expect(picked()).toEqual(['readme']);
  });

  it('selects nothing at all in mode none', () => {
    fixture.componentInstance.selectionMode.set('none');
    fixture.detectChanges();

    click(1);
    expect(picked()).toEqual([]);
  });

  it('takes no selection while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    click(1);
    expect(picked()).toEqual([]);
  });

  it('keeps the tree to a single tab stop rather than one per row', () => {
    toggle(0); // expand, so there are five rows to count

    // The roving-cursor contract: tabbing through a hundred-node tree must not
    // mean a hundred tab stops.
    const tabbable = rows().filter(r => (r.getAttribute('tabindex') ?? '-1') !== '-1');
    expect(tabbable.length).toBeLessThanOrEqual(1);
  });

  it('leaves keys it does not own to the page', () => {
    expect(press('Tab').defaultPrevented).toBe(false);
  });

  it('follows a selection written from outside', () => {
    fixture.componentInstance.picked.set(['readme']);
    fixture.detectChanges();

    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });
});

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      openOn="overlay"
      [nodes]="nodes()"
      [defaultExpandAll]="true"
      [(expanded)]="expanded"
      placeholder="Pick a file"
    />
  `,
})
class ExpandAllHost {
  readonly nodes = signal(NODES);
  readonly expanded = signal<readonly string[]>([]);
}

describe('WrTree row semantics', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const rows = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="treeitem"]'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('tells each row where it sits, in the plain shape as well as the virtual one', () => {
    // The rendered list is flat in both shapes — there is no `role="group"` — so the
    // set a row belongs to only exists in these two attributes. They used to be
    // gated behind `virtualScroll`, which made the same tree announce positions
    // with windowing on and nothing with it off.
    // Counted within the SIBLING GROUP, not the flat list — `app` is the 1st of
    // `src`'s 2 children even though it is the 2nd row on screen. That is what
    // ARIA asks for, and it is the whole reason the attributes are needed when
    // the DOM cannot express the nesting.
    const all = rows();
    expect(all.map(r => r.textContent.trim().split('\n')[0])).toHaveLength(5);
    expect(all.map(r => r.getAttribute('aria-posinset'))).toEqual(['1', '1', '2', '2', '3']);
    expect(all.map(r => r.getAttribute('aria-setsize'))).toEqual(['3', '2', '2', '3', '3']);
  });

  it('still reports depth alongside it', () => {
    expect(rows()[0].getAttribute('aria-level')).toBe('1');
    expect(rows()[1].getAttribute('aria-level')).toBe('2');
  });
});

describe('WrTree keyboard cursor', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const rowFor = (label: string): HTMLElement => rows().find(r => r.textContent.includes(label))!;
  const tabbable = (): HTMLElement[] => rows().filter(r => r.getAttribute('tabindex') === '0');
  const toggleIn = (row: HTMLElement): void => {
    row.querySelector<HTMLButtonElement>('.wr-tree__toggle')!.click();
    fixture.detectChanges();
  };
  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    root().querySelector('[role="tree"]')!.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.expanded.set(['src', 'app']);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps exactly one tab stop when the list shrinks under the cursor', () => {
    // The cursor is a raw index that only grew. Collapsing a branch ABOVE it left
    // it past the end of the list, and since the tab stop is handed out by
    // identity, the tree ended up with none at all — no way back in with Tab.
    rowFor('README.md').click();
    fixture.detectChanges();
    expect(tabbable().length).toBe(1);

    toggleIn(rowFor('src'));

    expect(rows().length).toBe(3);
    expect(tabbable().length).toBe(1);
  });

  it('still answers the arrow keys after that', () => {
    // `onKeydown` bails when the row under the cursor does not exist, so a stale
    // index made every key a no-op — silently, since nothing moves either way.
    rowFor('README.md').click();
    fixture.detectChanges();
    toggleIn(rowFor('src'));

    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(press('ArrowUp').defaultPrevented).toBe(true);
  });
});

describe('WrTree with defaultExpandAll', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ExpandAllHost>>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!;
  const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const toggleIn = (row: HTMLElement): void => {
    row.querySelector<HTMLButtonElement>('.wr-tree__toggle')!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(ExpandAllHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('opens the whole tree on the first open', () => {
    trigger().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.expanded()).toEqual(['src', 'app']);
    expect(rows().length).toBeGreaterThan(3);
  });

  it('can be collapsed all the way back, by hand', () => {
    // The effect read `expanded()` inside its own guard, so it re-ran the moment
    // the last branch closed and expanded everything again: the tree could be
    // collapsed one branch at a time but never fully, and the input's own doc
    // scopes it to "first open".
    trigger().click();
    fixture.detectChanges();

    const branch = (id: string): HTMLElement => rows().find(r => r.textContent.includes(id))!;
    toggleIn(branch('app'));
    expect(fixture.componentInstance.expanded()).toEqual(['src']);

    toggleIn(branch('src'));
    expect(fixture.componentInstance.expanded()).toEqual([]);
  });

  it('does not re-inflate a collapse the host writes', () => {
    trigger().click();
    fixture.detectChanges();

    fixture.componentInstance.expanded.set([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.expanded()).toEqual([]);
  });

  it('expands again the next time it opens', () => {
    trigger().click();
    fixture.detectChanges();
    fixture.componentInstance.expanded.set([]);
    fixture.detectChanges();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.expanded()).toEqual(['src', 'app']);
  });
});

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      [nodes]="nodes()"
      [(expanded)]="expanded"
      [virtualScroll]="virtual()"
      [rowHeight]="32"
      [viewportHeight]="200"
    />
  `,
})
class DirHost {
  readonly nodes = signal(NODES);
  readonly expanded = signal<readonly string[]>([]);
  readonly virtual = signal(false);
}

/**
 * Reading direction and the expand / collapse arrows.
 *
 * The APG gives ArrowRight the job of opening a branch because the arrows follow
 * the INDENT, and the indent grows rightward. Under `dir="rtl"` it grows the
 * other way, so the pair swaps — and until it did, an RTL user could not open a
 * tree at all: ArrowRight only ever closed something already closed, silently.
 *
 * Every case below is a pair pressing the SAME key in both directions and
 * expecting opposite outcomes. Asserting only the RTL half cannot tell "mirrors
 * correctly" from "always opens on ArrowLeft".
 */
describe('WrTree arrow keys follow the reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DirHost>>;

  const mount = (direction: Direction, virtual = false): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        // `Directionality` reads the document once at construction, so a fake is
        // the honest way to put the component in an RTL page.
        { provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } },
      ],
    });
    fixture = TestBed.createComponent(DirHost);
    fixture.componentInstance.virtual.set(virtual);
    fixture.detectChanges();
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('[role="tree"]')!;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const labels = (): string[] => rows().map(r => r.textContent.replace(/\s+/g, ' ').trim());
  const expanded = (): readonly string[] => fixture.componentInstance.expanded();
  const press = (key: string): void => {
    list().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  /** Label of the row the cursor is on, whichever pattern is carrying it. */
  const cursorLabel = (): string | null => {
    const active = list().getAttribute('aria-activedescendant');
    const row = active
      ? rows().find(r => r.getAttribute('id') === active)
      : rows().find(r => r.getAttribute('tabindex') === '0');
    return row ? row.textContent.replace(/\s+/g, ' ').trim() : null;
  };

  afterEach(() => fixture.destroy());

  it('opens the branch under the cursor on ArrowRight in LTR', () => {
    mount('ltr');

    press('ArrowRight');

    expect(expanded()).toEqual(['src']);
  });

  it('leaves it shut on ArrowRight in RTL — there that is the CLOSING key', () => {
    mount('rtl');

    press('ArrowRight');

    expect(expanded()).toEqual([]);
  });

  it('opens the branch under the cursor on ArrowLeft in RTL', () => {
    mount('rtl');

    press('ArrowLeft');

    expect(expanded()).toEqual(['src']);
  });

  it('leaves it shut on ArrowLeft in LTR', () => {
    mount('ltr');

    press('ArrowLeft');

    expect(expanded()).toEqual([]);
  });

  it('closes an open branch on ArrowLeft in LTR', () => {
    mount('ltr');
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();

    press('ArrowLeft');

    expect(expanded()).toEqual([]);
  });

  it('closes an open branch on ArrowRight in RTL', () => {
    mount('rtl');
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();

    press('ArrowRight');

    expect(expanded()).toEqual([]);
  });

  it('steps INTO an already-open branch with the opening key, in each direction', () => {
    // The APG's second job for the opening key: on an open branch it moves the
    // cursor to the first child rather than toggling anything.
    mount('ltr');
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();
    press('ArrowRight');
    expect(cursorLabel()).toBe('app');
    expect(expanded()).toEqual(['src']);

    mount('rtl');
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();
    press('ArrowLeft');
    expect(cursorLabel()).toBe('app');
    expect(expanded()).toEqual(['src']);
  });

  it('steps OUT to the parent with the closing key, in each direction', () => {
    mount('ltr');
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();
    press('ArrowDown'); // onto `app`, a closed branch at depth 1
    press('ArrowLeft'); // closed already, so this walks out instead
    expect(cursorLabel()).toBe('src');

    mount('rtl');
    fixture.componentInstance.expanded.set(['src']);
    fixture.detectChanges();
    press('ArrowDown');
    press('ArrowRight');
    expect(cursorLabel()).toBe('src');
  });

  it('keeps Up / Down on the block axis — `dir` governs the inline one', () => {
    mount('ltr');
    press('ArrowDown');
    expect(cursorLabel()).toBe('README.md');

    mount('rtl');
    press('ArrowDown');
    expect(cursorLabel()).toBe('README.md');
  });

  it('keeps Home / End semantic — first and last, not leftmost and rightmost', () => {
    mount('rtl');

    press('End');
    expect(cursorLabel()).toBe('node_modules');
    press('Home');
    expect(cursorLabel()).toBe('src');
  });

  describe('with the list windowed', () => {
    it('mirrors on the aria-activedescendant path too, not only the rendered one', () => {
      // Same handler, but the cursor lives in `aria-activedescendant` instead of a
      // roving tabindex — worth pinning, because a fix applied to only one of the
      // two shapes looks complete from the outside.
      mount('rtl', true);
      expect(list().getAttribute('aria-activedescendant')).toBeTruthy();

      press('ArrowLeft');
      expect(expanded()).toEqual(['src']);
      expect(labels()).toContain('app');

      press('ArrowLeft');
      expect(cursorLabel()).toBe('app');
    });

    it('mirrors the other way in LTR, on the same path', () => {
      mount('ltr', true);
      expect(list().getAttribute('aria-activedescendant')).toBeTruthy();

      press('ArrowLeft');
      expect(expanded()).toEqual([]);

      press('ArrowRight');
      expect(expanded()).toEqual(['src']);
      expect(labels()).toContain('app');

      press('ArrowRight');
      expect(cursorLabel()).toBe('app');
    });
  });
});

describe('WrTree in overlay mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OverlayHost>>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!;
  const list = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="tree"]');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(OverlayHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents a combobox that promises a tree, and opens one', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('tree');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(list()).toBeNull();

    trigger().click();
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(list()).not.toBeNull();
  });

  it('points the trigger at the panel it opened', () => {
    trigger().click();
    fixture.detectChanges();

    const controls = trigger().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it('closes on Escape', () => {
    trigger().click();
    fixture.detectChanges();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(list()).toBeNull();
  });

  /**
   * The keydown handler lives on the `<ul>` inside the portal, and the trigger
   * has none of its own — so an open panel with focus still on the trigger is
   * mouse-only. Only the VIRTUAL shape ever moved focus, which is why this went
   * unnoticed: the default overlay tree is not windowed.
   *
   * Note what these must NOT do: sending the keys to the list directly, the way
   * `WrTreeHarness.press()` does, answers identically for a working component
   * and a broken one. Every case here starts from `document.activeElement`.
   */
  describe('keyboard, once the panel is open', () => {
    const labels = (): string[] =>
      [...document.querySelectorAll<HTMLElement>('.wr-tree__label')].map(el => (el.textContent ?? '').trim());

    const open = async (): Promise<void> => {
      trigger().click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    const pressActive = async (key: string): Promise<void> => {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('hands focus to the roving row instead of leaving it on the trigger', async () => {
      await open();

      const row = document.querySelector<HTMLElement>('[data-tree-index="0"]')!;
      expect(document.activeElement).toBe(row);
      expect(document.activeElement).not.toBe(trigger());
    });

    it('expands a branch from the keyboard', async () => {
      await open();
      expect(labels()).not.toContain('app');

      await pressActive('ArrowRight');

      expect(labels()).toContain('app');
    });

    it('picks a node with Enter, which commits the value and closes the panel', async () => {
      await open();

      await pressActive('ArrowDown');
      await pressActive('Enter');

      expect(fixture.componentInstance.picked()).toBe('readme');
      expect(list()).toBeNull();
    });

    it('gives focus back to the trigger when the panel closes', async () => {
      await open();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(trigger());
    });
  });
});

/**
 * `wr-select` has always fallen through an unset placeholder to the catalog;
 * `wr-tree` rendered `placeholder()` raw, so `tree.placeholder` shipped in both
 * catalogs and reached nothing — an overlay trigger with no selection rendered
 * an empty span where the select next to it read "Select…".
 */
describe('WrTree placeholder', () => {
  afterEach(() => TestBed.resetTestingModule());

  const mount = async (providers: unknown[]): Promise<HTMLElement> => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), ...(providers as never[])] });
    const fixture = TestBed.createComponent(PlaceholderHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('falls through to the catalog when none is bound', async () => {
    const el = await mount([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);

    const placeholder = el.querySelector('.wr-tree__placeholder')?.textContent?.trim() ?? '';
    expect(placeholder, 'the trigger rendered nothing at all').not.toBe('');
    expect(/\p{Script=Cyrillic}/u.test(placeholder), `"${placeholder}" is still English`).toBe(true);
  });

  it('renders nothing extra when there is no catalog either', async () => {
    // The English fallback is deliberately empty: a bare `wr-tree` should not
    // invent a placeholder nobody asked for.
    const el = await mount([]);
    expect(el.querySelector('.wr-tree__placeholder')?.textContent?.trim()).toBe('');
  });

  it('lets a bound placeholder win', async () => {
    const el = await mount([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);
    const host = TestBed.createComponent(BoundPlaceholderHost);
    host.detectChanges();
    await host.whenStable();
    host.detectChanges();

    expect(el).toBeTruthy();
    expect((host.nativeElement as HTMLElement).querySelector('.wr-tree__placeholder')?.textContent?.trim()).toBe(
      'Pick a folder'
    );
  });
});
