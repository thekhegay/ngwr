import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCascader } from './cascader';
import type { WrCascaderOption } from './interfaces';

const OPTIONS: readonly WrCascaderOption[] = [
  {
    value: 'eu',
    label: 'Europe',
    children: [
      { value: 'de', label: 'Germany', children: [{ value: 'ber', label: 'Berlin' }] },
      { value: 'fr', label: 'France', children: [{ value: 'par', label: 'Paris' }] },
    ],
  },
  {
    value: 'as',
    label: 'Asia',
    children: [{ value: 'jp', label: 'Japan', disabled: true, children: [{ value: 'tky', label: 'Tokyo' }] }],
  },
  { value: 'an', label: 'Antarctica' },
];

@Component({
  imports: [WrCascader],
  template: `
    <wr-cascader
      placeholder="Pick a place"
      ariaLabel="Place"
      [options]="options"
      [(value)]="picked"
      [changeOnSelect]="changeOnSelect()"
      [disabled]="disabled()"
    />
  `,
})
class Host {
  readonly options = OPTIONS;
  readonly picked = signal<unknown>([]);
  readonly changeOnSelect = signal(false);
  readonly disabled = signal(false);
}

/**
 * A cascader is a combobox whose popup is a `role="tree"`, drawn as one
 * `role="group"` COLUMN per level, and
 * its value is the whole path rather than the node — so "picked Berlin" means
 * `['eu', 'de', 'ber']`, and a consumer reading only the last segment loses the
 * context that made it meaningful.
 *
 * Unlike `wr-tree` and `wr-select`, every option here is its own tab stop
 * (`tabindex="0"`) rather than a roving cursor. That is the documented reason
 * virtual scrolling is deferred for this component — there is no
 * container-owned arrow-nav model to hang a window off — so the tab-stop shape
 * is a contract worth pinning rather than an oversight to tidy.
 */
describe('WrCascader', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('[role="combobox"]')!;
  // `wr-cascader-panel`, not `wr-cascader__panel` — the panel is its own block
  // rather than an element of the host, because it lives in the overlay. Getting
  // this wrong makes every "it closed" assertion pass without looking at
  // anything, which is how two of them here were green before it was checked.
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-cascader-panel');
  const columns = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-cascader__col')];
  const optionsIn = (col: number): HTMLElement[] => [
    ...columns()[col].querySelectorAll<HTMLElement>('[role="treeitem"]'),
  ];
  const optionFor = (label: string): HTMLElement | undefined =>
    [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')].find(o => o.textContent.trim() === label);
  const picked = (): unknown => fixture.componentInstance.picked();
  const shownLabel = (): string | undefined => root().querySelector('.wr-cascader__value')?.textContent?.trim();

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };
  const choose = (label: string): void => {
    optionFor(label)!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('the trigger', () => {
    it('presents a combobox that promises the tree it opens', () => {
      // NOT `menu`, and the distinction is the whole point of this shape: a
      // combobox's popup may be a listbox, a tree, a grid or a dialog, and
      // nothing else. axe cannot see the difference — `menu` is a valid token
      // for the global `aria-haspopup` — so this assertion is the only guard.
      expect(trigger().getAttribute('aria-haspopup')).toBe('tree');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(trigger().getAttribute('aria-label')).toBe('Place');
    });

    it('shows the placeholder until something is chosen', () => {
      expect(root().querySelector('.wr-cascader__placeholder')!.textContent.trim()).toBe('Pick a place');
    });

    it('flips aria-expanded and points at the panel it opened', () => {
      open();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      const controls = trigger().getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      expect(document.getElementById(controls!)).not.toBeNull();
    });

    it('does not open while disabled', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      trigger().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(panel()).toBeNull();
    });
  });

  /**
   * The way IN, which the component did not have. The pane is appended to `<body>`,
   * so an open panel with the caret still on the trigger put every option after the
   * whole rest of the page in tab order — the same defect `wr-tree` and
   * `wr-context-menu` were fixed for. Nothing here sends a key to an option directly:
   * each case starts from `document.activeElement`, or it would answer the same for a
   * working component and a broken one.
   */
  describe('the keyboard way in', () => {
    // `afterNextRender`, so the fixture has to settle before the caret has moved —
    // a synchronous `detectChanges()` alone is exactly what would hide a microtask bug.
    const openAndSettle = async (): Promise<void> => {
      trigger().click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      trigger().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    it('moves the caret into the panel rather than leaving it on the trigger', async () => {
      await openAndSettle();

      expect(document.activeElement).toBe(optionFor('Europe'));
      expect(document.activeElement).not.toBe(trigger());
    });

    it('lands on the option already chosen, not on the first one', async () => {
      fixture.componentInstance.picked.set(['as']);
      fixture.detectChanges();

      await openAndSettle();

      expect(document.activeElement).toBe(optionFor('Asia'));
    });

    it('opens on ArrowDown from the trigger', async () => {
      expect(press('ArrowDown').defaultPrevented).toBe(true);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panel()).not.toBeNull();
      expect(document.activeElement).toBe(optionFor('Europe'));
    });

    it('opens on ArrowUp and on Alt+ArrowDown, the combobox spellings of the same thing', async () => {
      press('ArrowUp');
      await fixture.whenStable();
      expect(panel()).not.toBeNull();

      press('Escape');
      fixture.detectChanges();

      press('ArrowDown', { altKey: true });
      await fixture.whenStable();
      expect(panel()).not.toBeNull();
    });

    it('leaves a key it does not own to the page', () => {
      expect(press('a').defaultPrevented).toBe(false);
      expect(panel()).toBeNull();
    });

    it('does not open from the keyboard while disabled', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(press('ArrowDown').defaultPrevented).toBe(false);
      expect(panel()).toBeNull();
    });
  });

  describe('columns', () => {
    it('opens with the roots in a single column', () => {
      open();

      expect(columns()).toHaveLength(1);
      expect(optionsIn(0).map(o => o.textContent.trim())).toEqual(['Europe', 'Asia', 'Antarctica']);
    });

    it('adds a column per level as a branch is chosen', () => {
      open();
      choose('Europe');
      expect(columns()).toHaveLength(2);

      choose('Germany');
      expect(columns()).toHaveLength(3);
      expect(optionsIn(2).map(o => o.textContent.trim())).toEqual(['Berlin']);
    });

    it('replaces the deeper columns when a sibling is chosen instead', () => {
      open();
      choose('Europe');
      choose('Germany');
      expect(optionsIn(2).map(o => o.textContent.trim())).toEqual(['Berlin']);

      choose('France');

      // Switching branch has to prune what was under the old one, or the panel
      // shows a path that no longer exists.
      expect(columns()).toHaveLength(3);
      expect(optionsIn(2).map(o => o.textContent.trim())).toEqual(['Paris']);
    });

    it('says which options go deeper, and which of them is open', () => {
      open();

      // The chevron beside a branch is `aria-hidden`, so without this the only
      // difference between "Europe" and "Antarctica" is a graphic.
      expect(optionFor('Europe')!.getAttribute('aria-expanded')).toBe('false');

      // A leaf promises nothing. Absent rather than `false`: `aria-expanded`
      // on a treeitem that opens nothing states a collapsed subtree exists.
      expect(optionFor('Antarctica')!.getAttribute('aria-expanded')).toBeNull();

      choose('Europe');

      expect(optionFor('Europe')!.getAttribute('aria-expanded')).toBe('true');
      // The sibling is still collapsed — one branch open, not the whole level.
      expect(optionFor('Asia')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('collapses the branch it left when a sibling takes over', () => {
      open();
      choose('Europe');
      choose('Germany');
      expect(optionFor('Germany')!.getAttribute('aria-expanded')).toBe('true');

      choose('France');

      // `columns()` prunes the column Germany owned, so a lingering `true`
      // would name a submenu that is no longer in the document.
      expect(optionFor('Germany')!.getAttribute('aria-expanded')).toBe('false');
      expect(optionFor('France')!.getAttribute('aria-expanded')).toBe('true');
    });

    it('states the depth the DOM cannot, and the position within it', () => {
      open();
      choose('Europe');
      choose('Germany');

      // The columns are SIBLINGS, so ancestry represents no level at all —
      // without aria-level every option in the panel reads as level 1 and the
      // hierarchy the component exists to express is invisible.
      expect(optionFor('Europe')!.getAttribute('aria-level')).toBe('1');
      expect(optionFor('Germany')!.getAttribute('aria-level')).toBe('2');
      expect(optionFor('Berlin')!.getAttribute('aria-level')).toBe('3');

      // The set is per column, not per panel.
      expect(optionFor('Europe')!.getAttribute('aria-setsize')).toBe('3');
      expect(optionFor('Europe')!.getAttribute('aria-posinset')).toBe('1');
      expect(optionFor('Antarctica')!.getAttribute('aria-posinset')).toBe('3');
      expect(optionFor('Germany')!.getAttribute('aria-setsize')).toBe('2');
      expect(optionFor('France')!.getAttribute('aria-posinset')).toBe('2');
    });

    it('names each column after the option whose children it holds', () => {
      open();
      choose('Europe');

      // Nothing in the markup says the second column belongs to "Europe" —
      // they are siblings. Column 0 has no parent and stays unnamed.
      expect(columns()[0].getAttribute('aria-labelledby')).toBeNull();
      const named = columns()[1].getAttribute('aria-labelledby');
      expect(document.getElementById(named!)).toBe(optionFor('Europe')!);

      // And the branch points back, which is what makes `aria-expanded` refer
      // to something when the expanded content is not a descendant.
      expect(optionFor('Europe')!.getAttribute('aria-controls')).toBe(columns()[1].id);
    });

    it('never points aria-controls at a column that is not on screen', () => {
      open();

      // Collapsed: no reference at all. A dangling one is a violation the
      // moment `aria-expanded` says true, so the two ride one invariant.
      expect(optionFor('Europe')!.getAttribute('aria-controls')).toBeNull();

      choose('Europe');
      choose('Germany');
      choose('France');

      // Switching branch prunes Germany's column — its reference goes with it.
      expect(optionFor('Germany')!.getAttribute('aria-controls')).toBeNull();
      expect(document.getElementById(optionFor('France')!.getAttribute('aria-controls')!)).not.toBeNull();
    });

    it('marks what can be chosen, and separates it from where the user walked', () => {
      open();
      choose('Europe');

      // `--active` is navigation; `aria-selected` is the commitment. They
      // diverge for the whole walk down, and agree only once a leaf lands.
      expect(optionFor('Europe')!.classList.contains('wr-cascader__opt--active')).toBe(true);
      // A branch cannot be chosen while `changeOnSelect` is off — absent, not
      // `false`, because ARIA reads a missing aria-selected as "not selectable".
      expect(optionFor('Europe')!.getAttribute('aria-selected')).toBeNull();
      // Germany is a branch too, so it is silent for the same reason.
      expect(optionFor('Germany')!.getAttribute('aria-selected')).toBeNull();
      // A LEAF always can be chosen, so it says so even while it is not the
      // choice — that is the signal a missing attribute would destroy.
      expect(optionFor('Antarctica')!.getAttribute('aria-selected')).toBe('false');

      choose('Germany');

      // The leaf is on screen and choosable, and says so before it is chosen.
      expect(optionFor('Berlin')!.getAttribute('aria-selected')).toBe('false');

      choose('Berlin');
      // Choosing a leaf commits and CLOSES, so nothing is in the DOM to read —
      // reopening is what puts the committed path back on screen.
      open();

      expect(optionFor('Berlin')!.getAttribute('aria-selected')).toBe('true');
      expect(optionFor('Antarctica')!.getAttribute('aria-selected')).toBe('false');
    });

    it('makes a branch selectable in ARIA once changeOnSelect says it is', () => {
      fixture.componentInstance.changeOnSelect.set(true);
      fixture.detectChanges();
      open();

      // The one binding that gives the changeOnSelect contract an ARIA
      // expression, in both directions.
      expect(optionFor('Europe')!.getAttribute('aria-selected')).toBe('false');

      choose('Europe');

      expect(optionFor('Europe')!.getAttribute('aria-selected')).toBe('true');

      choose('Germany');

      // Only the TERMINAL of the path is selected. The ancestors carry the path
      // through `aria-expanded` instead, which is what makes a tree the right
      // shape for a path-valued control — and this is the only configuration
      // that can prove it, since a committable non-terminal needs branches to
      // be committable in the first place.
      expect(optionFor('Germany')!.getAttribute('aria-selected')).toBe('true');
      expect(optionFor('Europe')!.getAttribute('aria-selected')).toBe('false');
      expect(optionFor('Europe')!.getAttribute('aria-expanded')).toBe('true');
    });

    it('gives every enabled option its own tab stop', () => {
      open();
      choose('Europe');

      // Not a roving cursor — this is why virtual scrolling is deferred here.
      const all = [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')];
      expect(
        all.filter(o => o.getAttribute('aria-disabled') !== 'true').every(o => o.getAttribute('tabindex') === '0')
      ).toBe(true);
    });
  });

  describe('choosing', () => {
    it('commits the whole PATH when a leaf is reached, and closes', () => {
      open();
      choose('Europe');
      choose('Germany');
      choose('Berlin');

      // The path, not the leaf: 'ber' alone would not say which country.
      expect(picked()).toEqual(['eu', 'de', 'ber']);
      expect(panel()).toBeNull();
    });

    /**
     * Every option is its own tab stop, so on the keyboard the caret is INSIDE
     * the pane by design — and picking a leaf is what closes it. Disposing
     * without handing focus back dropped it on `<body>` on the SUCCESS path,
     * leaving a keyboard user who had just chosen a value to Tab from the top
     * of the document to get back to the control.
     */
    it('gives focus back to the trigger when a pick closes the panel', () => {
      open();
      choose('Europe');
      choose('Germany');
      const leaf = optionFor('Berlin')!;
      leaf.focus();
      leaf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(document.activeElement, 'focus was stranded on <body>').toBe(trigger());
    });

    it('commits a childless root as a one-segment path', () => {
      open();
      choose('Antarctica');

      expect(picked()).toEqual(['an']);
      expect(panel()).toBeNull();
    });

    it('commits nothing on the way down by default', () => {
      open();
      choose('Europe');

      // A branch is navigation, not a choice — committing here would fire a
      // bound form field once per level on the way to the answer.
      expect(picked()).toEqual([]);
      expect(panel()).not.toBeNull();
    });

    it('commits at every level when changeOnSelect is on, and stays open', () => {
      fixture.componentInstance.changeOnSelect.set(true);
      fixture.detectChanges();
      open();

      choose('Europe');
      expect(picked()).toEqual(['eu']);
      // Still open: the user may want to go deeper, and a parent commit is not
      // the end of the interaction.
      expect(panel()).not.toBeNull();

      choose('Germany');
      expect(picked()).toEqual(['eu', 'de']);
    });

    it('refuses a disabled option, and says it is disabled', () => {
      open();
      choose('Asia');

      const japan = optionFor('Japan')!;
      expect(japan.getAttribute('aria-disabled')).toBe('true');
      expect(japan.getAttribute('tabindex')).toBe('-1');

      japan.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(picked()).toEqual([]);
      // And it must not open its children either.
      expect(optionFor('Tokyo')).toBeUndefined();
    });

    it('commits from the keyboard too', () => {
      open();
      optionFor('Antarctica')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );
      fixture.detectChanges();

      expect(picked()).toEqual(['an']);
    });
  });

  describe('the chosen value', () => {
    it('shows the path on the trigger', () => {
      open();
      choose('Europe');
      choose('Germany');
      choose('Berlin');

      const label = shownLabel() ?? '';
      expect(label).toContain('Europe');
      expect(label).toContain('Berlin');
    });

    it('clears back to the placeholder', () => {
      open();
      choose('Antarctica');
      expect(picked()).toEqual(['an']);

      root().querySelector<HTMLElement>('.wr-cascader__clear')!.click();
      fixture.detectChanges();

      expect(picked()).toEqual([]);
      expect(root().querySelector('.wr-cascader__placeholder')).not.toBeNull();
    });

    it('offers no clear button while there is nothing to clear', () => {
      expect(root().querySelector('.wr-cascader__clear')).toBeNull();
    });

    it('carries the public BEM classes', () => {
      expect(root().querySelector('wr-cascader')!.className).toContain('wr-cascader');
    });
  });
});
