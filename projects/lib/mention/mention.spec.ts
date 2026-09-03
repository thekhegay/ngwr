import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDialog } from 'ngwr/dialog';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrMentionCommit, WrMentionItem } from './interfaces';
import { WrMention } from './mention';

const PEOPLE: readonly WrMentionItem[] = [
  { id: 'ada', label: 'Ada Lovelace' },
  { id: 'alan', label: 'Alan Turing' },
  { id: 'grace', label: 'Grace Hopper' },
  { id: 'linus', label: 'Linus Torvalds' },
];

const MANY: readonly WrMentionItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `p${i}`,
  label: `Person ${i}`,
}));

@Component({
  imports: [WrMention],
  template: ` <textarea wrMention [wrMentionItems]="items" [filterWith]="startsWith"></textarea> `,
})
class PrefixHost {
  readonly items = PEOPLE;
  readonly startsWith = (query: string, item: WrMentionItem): boolean =>
    item.label.toLowerCase().startsWith(query.toLowerCase());
}

@Component({
  imports: [WrMention],
  template: `
    <textarea
      wrMention
      [wrMentionItems]="items()"
      [triggers]="triggers()"
      [maxResults]="maxResults()"
      (wrMentionSelected)="committed.set($event)"
    ></textarea>
  `,
})
class Host {
  readonly items = signal(PEOPLE);
  readonly triggers = signal<readonly string[]>(['@']);
  readonly maxResults = signal(8);
  readonly committed = signal<WrMentionCommit | null>(null);
}

/**
 * The ARIA here is a set of deliberate decisions that each look wrong at a
 * glance, and the source spells out why. The host stays a `textbox` and is NOT a
 * combobox — the field holds prose and a mention is one fragment inside it, not
 * the field's value; `role="combobox"` is also disallowed on `<textarea>` and
 * would drop `aria-multiline` for the whole editing session.
 *
 * The sharpest distinction is between the two references. `aria-controls` is
 * allowed to dangle — it names the panel's id even while the panel is closed,
 * because gating it would mean gating `aria-autocomplete` too, and an
 * unresolved `controls` is only a manual-review note to axe.
 * `aria-activedescendant` is NOT allowed to dangle: naming an absent element is
 * an author error, so it has to disappear the moment the panel does.
 */
describe('WrMention', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const field = (): HTMLTextAreaElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('textarea')!;
  const listbox = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="listbox"]');
  const optionLabels = (): string[] =>
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(o => o.textContent.trim());
  const activeOption = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');

  /** Type into the field the way a person does — value plus an `input` event. */
  const type = (text: string): void => {
    const el = field();
    el.value = text;
    el.selectionStart = el.selectionEnd = text.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    field().dispatchEvent(event);
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

  describe('the field it attaches to', () => {
    it('stays a textbox rather than becoming a combobox', () => {
      // `role="combobox"` on a `<textarea>` is disallowed by ARIA in HTML, and
      // it would also drop `aria-multiline` — a screen reader would stop
      // reporting the field as multi-line for the whole session.
      expect(field().getAttribute('role')).toBeNull();
      expect(field().tagName).toBe('TEXTAREA');
    });

    it('advertises the capability permanently, not only while suggesting', () => {
      // Static on purpose: ARIA says authors should not toggle
      // `aria-autocomplete` to signal that suggestions are showing, and being
      // static is what makes the feature discoverable on focus.
      expect(field().getAttribute('aria-autocomplete')).toBe('list');
      expect(field().getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('names the panel through aria-controls even while it is closed', () => {
      expect(listbox()).toBeNull();
      // Allowed to dangle: gating it would mean gating `aria-autocomplete` too,
      // and an unresolved `controls` is a manual-review note, never a violation.
      expect(field().getAttribute('aria-controls')).toBeTruthy();
    });

    it('never names an absent active option', () => {
      // The other half of the pair, and the strict one: `aria-activedescendant`
      // pointing at an element that does not exist is an author error.
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
    });
  });

  describe('opening', () => {
    it('opens on the trigger character', () => {
      type('hey @');

      expect(listbox()).not.toBeNull();
      expect(optionLabels().length).toBeGreaterThan(0);
    });

    it('stays shut for ordinary prose', () => {
      type('just writing a sentence');

      expect(listbox()).toBeNull();
    });

    it('points aria-activedescendant at a real option once open', () => {
      type('hey @');

      const active = field().getAttribute('aria-activedescendant');
      expect(active).toBeTruthy();
      expect(document.getElementById(active!)).not.toBeNull();
    });

    it('honours a custom trigger set', () => {
      fixture.componentInstance.triggers.set(['#']);
      fixture.detectChanges();

      type('hey @');
      expect(listbox()).toBeNull();

      type('hey #');
      expect(listbox()).not.toBeNull();
    });
  });

  describe('filtering', () => {
    it('narrows on the query typed after the trigger, matching anywhere in the label', () => {
      type('hey @al');

      // A SUBSTRING match, not a prefix one — "al" reaches "Alan" and also
      // "TorvALds". That is the friendlier default for names, where people type
      // the part they remember rather than the beginning.
      expect(optionLabels()).toEqual(['Alan Turing', 'Linus Torvalds']);
    });

    it('narrows to one when the query is unambiguous', () => {
      type('hey @grace');

      expect(optionLabels()).toEqual(['Grace Hopper']);
    });

    it('takes a custom filter over the substring default', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
      const prefixed = TestBed.createComponent(PrefixHost);
      prefixed.detectChanges();

      const el = (prefixed.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('textarea')!;
      el.value = 'hey @al';
      el.selectionStart = el.selectionEnd = 7;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      prefixed.detectChanges();

      // The same query, a prefix predicate: "TorvALds" no longer qualifies.
      expect([...document.querySelectorAll<HTMLElement>('[role="option"]')].map(o => o.textContent.trim())).toEqual([
        'Alan Turing',
      ]);
      prefixed.destroy();
    });

    it('matches without regard to case', () => {
      type('hey @ADA');

      expect(optionLabels()).toEqual(['Ada Lovelace']);
    });

    it('caps the list at maxResults', () => {
      fixture.componentInstance.items.set(MANY);
      fixture.detectChanges();

      type('hey @Person');

      // Twenty matches, eight shown. The cap is why this panel needs no
      // virtualisation, and dropping it would put an unbounded list into the
      // overlay.
      expect(optionLabels()).toHaveLength(8);
    });

    it('respects a smaller cap', () => {
      fixture.componentInstance.items.set(MANY);
      fixture.componentInstance.maxResults.set(3);
      fixture.detectChanges();

      type('hey @Person');

      expect(optionLabels()).toHaveLength(3);
    });

    it('closes again when nothing matches', () => {
      type('hey @zzzz');

      expect(listbox()).toBeNull();
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
    });
  });

  describe('choosing', () => {
    it('walks the list with the arrows', () => {
      type('hey @');
      const first = activeOption()!.textContent.trim();

      press('ArrowDown');
      expect(activeOption()!.textContent.trim()).not.toBe(first);

      press('ArrowUp');
      expect(activeOption()!.textContent.trim()).toBe(first);
    });

    it('commits on Enter and reports the trigger and query with the item', () => {
      type('hey @al');
      press('Enter');

      const commit = fixture.componentInstance.committed();
      // All three: the host needs the trigger to know WHICH kind of mention it
      // was, and the query to know how much text to replace.
      expect(commit?.item.label).toBe('Alan Turing');
      expect(commit?.trigger).toBe('@');
      expect(commit?.query).toBe('al');
    });

    it('inserts the mention into the field text', () => {
      type('hey @al');
      press('Enter');

      expect(field().value).toContain('Alan Turing');
      expect(field().value.startsWith('hey ')).toBe(true);
    });

    it('closes after committing', () => {
      type('hey @al');
      press('Enter');

      expect(listbox()).toBeNull();
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
    });

    it('closes on Escape without committing', () => {
      type('hey @al');
      press('Escape');

      expect(listbox()).toBeNull();
      expect(fixture.componentInstance.committed()).toBeNull();
    });

    it('leaves Enter to the field when the panel is closed', () => {
      type('just prose');
      const event = press('Enter');

      // A textarea's Enter is a newline. Swallowing it whenever the directive
      // is attached would make the field unable to hold paragraphs.
      expect(event.defaultPrevented).toBe(false);
    });
  });

  /**
   * ⚠️ Half of this one is unobservable here.
   *
   * The panel used to be pinned with `position().global().left(x).top(y)` from
   * the caret's viewport coordinates, which has neither an anchor nor a fallback
   * position — so it was always drawn downward from the caret however little
   * room was left below, and it stayed at those screen coordinates while the
   * page scrolled out from under it. Measured in Chromium at 1280x900 with the
   * field's bottom 60px above the fold: the 192x214 panel opened at y=791.1,
   * 105.1px past the viewport, with the last three options unreachable by
   * pointer (`elementFromPoint` → null) and equally unreachable by keyboard —
   * `aria-activedescendant` walked onto them while nothing scrolled, a WCAG
   * 2.4.11 failure, not merely a pointer one. Three successive scrolls of
   * 40 / 60 / 50px then drifted it by exactly 40 / 60 / 50px.
   *
   * With a flexible strategy against a live virtual origin at the caret, the
   * same open flips above the caret (y=466.3, 131.7px clear of the fold, all six
   * options hit-testable) and those same three scrolls drift it by 0.0px.
   *
   * jsdom lays nothing out — every rect is 0x0, so there is no viewport to
   * overflow and no scrolling to follow. What it CAN show is which strategy owns
   * the panel, which each one stamps on the overlay's host element.
   */
  describe('the panel placement', () => {
    const pane = (): HTMLElement => document.querySelector<HTMLElement>('.wr-mention-overlay')!;

    it('anchors the panel with a flexible strategy, not a global one', () => {
      type('hey @al');

      expect(listbox()).not.toBeNull();
      expect(pane().parentElement!.classList.contains('cdk-overlay-connected-position-bounding-box')).toBe(true);
      expect(pane().parentElement!.classList.contains('cdk-global-overlay-wrapper')).toBe(false);
    });

    it('keeps that strategy across the keystrokes that re-filter the list', () => {
      // Each keystroke re-enters `open()`. It used to swap in a freshly built
      // global strategy holding the new caret coordinates; the anchor is live
      // now, so the strategy is built once and the pane must not fall back.
      type('hey @a');
      const first = pane();
      type('hey @al');

      expect(pane()).toBe(first);
      expect(pane().parentElement!.classList.contains('cdk-overlay-connected-position-bounding-box')).toBe(true);
    });
  });

  /**
   * jsdom runs no input method. Every event here is hand-built with the flags a
   * real one sets — `isComposing` on the keys an open candidate window owns, and
   * the `compositionstart` / `compositionend` pair around them — and the
   * assertion is that the directive did nothing until the text was real.
   *
   * A faithful test of the guard and no more: nothing below exercises kotoeri or
   * Pinyin, and it should not be read as saying the mention picker has been
   * driven by a real IME.
   */
  describe('IME composition', () => {
    const composeStart = (): void => {
      field().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      fixture.detectChanges();
    };

    const composeEnd = (): void => {
      field().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      fixture.detectChanges();
    };

    /** Type the way an IME does: the field fills with a half-built reading. */
    const composeType = (text: string): void => {
      const el = field();
      el.value = text;
      el.selectionStart = el.selectionEnd = text.length;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      fixture.detectChanges();
    };

    const composeKey = (key: string): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: true });
      field().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    it('does not open the panel on the half-built text of a conversion', () => {
      composeStart();
      // `Al` here is a reading on its way somewhere else; it happens to match two
      // people, which is the point — the old code opened on it.
      composeType('@Al');
      expect(listbox()).toBeNull();
    });

    it('opens on the text the conversion finally produced', () => {
      composeStart();
      composeType('@Ada');
      expect(listbox()).toBeNull();
      composeEnd();
      expect(optionLabels()).toEqual(['Ada Lovelace']);
    });

    it('closes a panel that was already open when a conversion starts', () => {
      type('@a');
      expect(listbox()).not.toBeNull();
      composeStart();
      expect(listbox(), 'an open panel would take the arrows from the candidate window').toBeNull();
    });

    it('leaves the first keystroke of a conversion to the input method', () => {
      // Chrome fires the 229 `keydown` BEFORE `compositionstart`, so the panel
      // from the previous word is still open when it arrives — the one moment the
      // keydown guard is load-bearing and `compositionstart` has not helped yet.
      type('@a');
      const first = activeOption()?.textContent?.trim();

      for (const key of ['ArrowDown', 'Escape']) {
        expect(composeKey(key).defaultPrevented, `${key} was taken from the IME`).toBe(false);
      }
      expect(listbox(), 'Escape closed the panel instead of cancelling the reading').not.toBeNull();
      expect(activeOption()?.textContent?.trim(), 'ArrowDown moved the panel, not the candidates').toBe(first);

      expect(composeKey('Enter').defaultPrevented).toBe(false);
      expect(fixture.componentInstance.committed(), 'a candidate Enter inserted a mention').toBeNull();
    });

    it("recognises Safari's committing keystroke, which carries only keyCode 229", () => {
      type('@a');
      // Safari fires `compositionend` before this keydown, so the directive's own
      // flag is already false and 229 is the only thing left to read.
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, keyCode: 229 });
      field().dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.committed()).toBeNull();
    });

    it('commits normally once the composition is over', () => {
      type('@a');
      press('Enter');
      expect(fixture.componentInstance.committed()?.item['id']).toBe('ada');
    });
  });
});

/** A mention field living inside a dialog — the shape a comment box usually has. */
@Component({
  imports: [WrMention],
  template: `<textarea wrMention [wrMentionItems]="items"></textarea>`,
})
class DialogBody {
  readonly items = PEOPLE;
}

@Component({ template: '' })
class Shell {
  readonly dialog = inject(WrDialog);
}

/**
 * The suggestion panel is the innermost thing Escape can dismiss, and it has to
 * keep the key: a mention field is normally INSIDE something else that closes on
 * Escape, and one press must not close both.
 *
 * CDK's `OverlayKeyboardDispatcher` does not sort this out on its own. It walks
 * the overlay stack newest-first and stops at the first overlay with a
 * `keydownEvents()` subscriber — the mention panel has none, since the key is
 * handled on the field itself — so the press reaches the dialog underneath.
 * `preventDefault()` does not help either: nothing in the library reads
 * `defaultPrevented` before closing.
 */
describe('WrMention inside a dialog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Shell>>;

  const field = (): HTMLTextAreaElement => document.querySelector<HTMLTextAreaElement>('textarea')!;
  const listbox = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="listbox"]');
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dialog-panel');

  const type = (text: string): void => {
    const el = field();
    el.value = text;
    el.selectionStart = el.selectionEnd = text.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const escape = async (): Promise<void> => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    fixture.componentInstance.dialog.open(DialogBody);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('spends the first Escape on its own panel and leaves the dialog up', async () => {
    type('hey @al');
    expect(listbox()).not.toBeNull();

    await escape();

    expect(listbox()).toBeNull();
    expect(panel()).not.toBeNull();
  });

  it('lets the next Escape through to the dialog', async () => {
    type('hey @al');
    await escape();
    await escape();

    expect(panel()).toBeNull();
  });

  it('does not swallow Escape when it has no panel open', async () => {
    type('just prose');
    expect(listbox()).toBeNull();

    await escape();

    expect(panel()).toBeNull();
  });
});
