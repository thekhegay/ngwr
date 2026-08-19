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
 * A cascader is a combobox that opens one `role="menu"` COLUMN per level, and
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
    ...columns()[col].querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ];
  const optionFor = (label: string): HTMLElement | undefined =>
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(o => o.textContent.trim() === label);
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
    it('presents a combobox that promises a menu', () => {
      expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
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

    it('gives every enabled option its own tab stop', () => {
      open();
      choose('Europe');

      // Not a roving cursor — this is why virtual scrolling is deferred here.
      const all = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
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
