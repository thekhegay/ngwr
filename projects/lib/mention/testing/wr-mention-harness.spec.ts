import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrMention, type WrMentionCommit, type WrMentionItem } from 'ngwr/mention';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrMentionHarness } from './wr-mention-harness';

const PEOPLE: readonly WrMentionItem[] = [
  { id: 'ada', label: 'Ada Lovelace' },
  { id: 'alan', label: 'Alan Turing' },
  { id: 'grace', label: 'Grace Hopper' },
  { id: 'linus', label: 'Linus Torvalds' },
];

const MANY: readonly WrMentionItem[] = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, label: `Person ${i}` }));

/** A mention item with its own metadata — what `displayWith` / `valueWith` exist for. */
interface Person extends WrMentionItem {
  readonly label: string;
  readonly name: string;
}

@Component({
  imports: [WrMention],
  template: `
    <textarea
      wrMention
      placeholder="Write a message"
      aria-label="Message"
      [wrMentionItems]="items()"
      [triggers]="triggers()"
      [maxResults]="maxResults()"
      (wrMentionSelected)="committed.set($event)"
    ></textarea>
  `,
})
class Host {
  readonly items = signal(PEOPLE);
  readonly triggers = signal<readonly string[]>(['@', '#']);
  readonly maxResults = signal(8);
  readonly committed = signal<WrMentionCommit | null>(null);
}

@Component({
  imports: [WrMention],
  template: `
    <textarea
      wrMention
      placeholder="Custom"
      aria-label="Custom"
      [wrMentionItems]="items"
      [displayWith]="display"
      [valueWith]="handle"
      [filterWith]="startsWith"
      (wrMentionSelected)="committed.set($event)"
    ></textarea>
  `,
})
class CustomHost {
  readonly items: readonly Person[] = [
    { label: 'ada', name: 'Ada Lovelace' },
    { label: 'alan', name: 'Alan Turing' },
    { label: 'linus', name: 'Linus Torvalds' },
  ];
  readonly display = (item: Person): string => item.name;
  readonly handle = (item: Person, trigger: string): string => `${trigger}${item.label}`;
  readonly startsWith = (query: string, item: Person): boolean =>
    item.name.toLowerCase().startsWith(query.toLowerCase());
  readonly committed = signal<WrMentionCommit<Person> | null>(null);
}

@Component({
  imports: [WrMention],
  // A `<textarea>` and an `<input>`: the directive drives either, so the harness's
  // selector has to match both. Different item sets, so "whose suggestions are
  // these" has an answer the assertions can tell apart.
  template: `
    <textarea wrMention placeholder="Fruit" aria-label="Fruit" [wrMentionItems]="fruit"></textarea>
    <input wrMention placeholder="Veg" aria-label="Veg" [wrMentionItems]="veg" />
  `,
})
class TwoHost {
  readonly fruit: readonly WrMentionItem[] = [{ label: 'Apple' }, { label: 'Apricot' }];
  readonly veg: readonly WrMentionItem[] = [{ label: 'Carrot' }];
}

/**
 * The panel is a ComponentPortal in the shared overlay container, so nothing this
 * spec asserts about a suggestion is reachable from the fixture — which is why the
 * harness scopes both its single-element and its list queries by the id the field
 * publishes as `aria-controls`. `provideWrOverlay()` keeps this file's container out
 * of the next one's.
 *
 * Real timers throughout: the close on blur is a real `setTimeout` inside the
 * directive, and under zoneless change detection nothing flushes it for us.
 *
 * What is deliberately absent is any assertion about WHERE the panel sits.
 * `caret.ts` measures a mirror `<div>` to place it at the caret, and jsdom has no
 * layout — every rect is zeros, so the measurement collapses to the origin plus the
 * line height `caret.ts` falls back to — so placement is a real-browser question
 * and the harness ships no coordinate reader to pretend otherwise.
 */
describe('WrMentionHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let mention: WrMentionHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    mention = await loader.getHarness(WrMentionHarness);
  });

  afterEach(() => fixture.destroy());

  describe('the field it attaches to', () => {
    it('advertises the popup permanently, and holds no open state of its own', async () => {
      // Static on purpose, both of them: ARIA says not to toggle
      // `aria-autocomplete` to signal that suggestions are showing, and
      // `aria-haspopup` has to name the popup's real role. There is no
      // `aria-expanded` to read at all — it is not a supported state of
      // `role="textbox"` — which is why `isOpen()` looks for the listbox instead.
      expect(await mention.getAutocomplete()).toBe('list');
      expect(await mention.getPopupRole()).toBe('listbox');
      expect(await mention.isOpen()).toBe(false);
    });

    it('names no active suggestion while it is not suggesting', async () => {
      // The strict half of the pair. A dangling `aria-activedescendant` is an
      // author error that no browser reports, so `null` here is the right answer.
      expect(await mention.getActiveOptionId()).toBeNull();
    });

    it('reads its text and placeholder off the native control', async () => {
      expect(await mention.getValue()).toBe('');
      expect(await mention.getPlaceholder()).toBe('Write a message');
    });
  });

  describe('opening', () => {
    it('opens on the trigger character with everything on offer', async () => {
      await mention.type('hey @');

      expect(await mention.isOpen()).toBe(true);
      expect(await mention.getOptionLabels()).toEqual([
        'Ada Lovelace',
        'Alan Turing',
        'Grace Hopper',
        'Linus Torvalds',
      ]);
      expect(await mention.getListboxRole()).toBe('listbox');
      // ARIA requires a listbox to be named; the copy itself is the catalog's business.
      expect(await mention.getListboxLabel()).toBeTruthy();
    });

    it('points aria-activedescendant at a suggestion that is really there', async () => {
      await mention.type('hey @');

      const id = await mention.getActiveOptionId();
      expect(id).toBeTruthy();
      // Resolving it is the assertion — `getActiveOptionLabel()` throws on a
      // reference that names nothing, which is exactly the silent failure.
      expect(await mention.getActiveOptionLabel()).toBe('Ada Lovelace');
      expect(await mention.getActiveOptionIndex()).toBe(0);
    });

    it('stays shut for ordinary prose, and refuses every read that would then be meaningless', async () => {
      await mention.type('just writing a sentence');

      expect(await mention.isOpen()).toBe(false);
      // A silent `[]` / `null` here becomes a confusing failure three lines later.
      await expect(mention.getOptions()).rejects.toThrow(/no suggestions are showing/);
      await expect(mention.getListboxLabel()).rejects.toThrow(/no suggestions are showing/);
      await expect(mention.getActiveOptionLabel()).rejects.toThrow(/names no active suggestion/);
      await expect(mention.getActiveOptionIndex()).rejects.toThrow(/names no active suggestion/);
      await expect(mention.commit()).rejects.toThrow(/Enter is a newline/);
      await expect(mention.nextOption()).rejects.toThrow(/no suggestions are showing/);
    });

    it('ignores a trigger char that is not at a word boundary', async () => {
      // An address is not a mention. The directive wants whitespace (or the start
      // of the text) immediately before the trigger — worth pinning here, because a
      // harness user who does not know it reads the closed panel as a broken setup.
      await mention.type('mail ada@');

      expect(await mention.isOpen()).toBe(false);
    });

    it('reopens on a click when the caret is still inside a mention', async () => {
      await mention.type('hey @al');
      await mention.dismiss();
      expect(await mention.isOpen()).toBe(false);

      // The directive re-detects on click, which is how a user who pressed Escape
      // gets the panel back without retyping the query.
      await mention.click();

      expect(await mention.isOpen()).toBe(true);
      expect(await mention.getOptionLabels()).toEqual(['Alan Turing', 'Linus Torvalds']);
    });

    it('honours every trigger in the set and reports which one fired', async () => {
      await mention.type('tag it #gr');
      expect(await mention.getOptionLabels()).toEqual(['Grace Hopper']);

      await mention.commit();

      // The inserted text carries the trigger that opened the panel, and so does
      // the payload — a host with two triggers needs it to know WHICH kind of
      // mention was made.
      expect(await mention.getValue()).toBe('tag it #Grace Hopper ');
      expect(fixture.componentInstance.committed()?.trigger).toBe('#');
    });

    it('stays shut for a character that is not in the trigger set', async () => {
      fixture.componentInstance.triggers.set(['#']);
      await fixture.whenStable();

      await mention.type('hey @');
      expect(await mention.isOpen()).toBe(false);

      await mention.clear();
      await mention.type('hey #');
      expect(await mention.isOpen()).toBe(true);
    });
  });

  describe('filtering', () => {
    it('narrows as the query grows, matching anywhere in the label', async () => {
      await mention.type('hey @');
      expect(await mention.getOptionLabels()).toHaveLength(4);

      await mention.type('al');
      // A SUBSTRING match, not a prefix one: "al" reaches "Alan" and "TorvALds".
      expect(await mention.getOptionLabels()).toEqual(['Alan Turing', 'Linus Torvalds']);

      await mention.type('an');
      expect(await mention.getOptionLabels()).toEqual(['Alan Turing']);
    });

    it('caps the list at maxResults', async () => {
      fixture.componentInstance.items.set(MANY);
      await fixture.whenStable();

      await mention.type('hey @Person');

      // Twenty matches, eight offered — the cap is why the panel needs no
      // virtualisation, and it is the whole list the user can reach.
      expect(await mention.getOptionLabels()).toHaveLength(8);
    });

    it('respects a smaller cap', async () => {
      fixture.componentInstance.items.set(MANY);
      fixture.componentInstance.maxResults.set(3);
      await fixture.whenStable();

      await mention.type('hey @Person');

      expect(await mention.getOptionLabels()).toHaveLength(3);
    });

    it('closes when nothing matches, and says so in the live region', async () => {
      await mention.type('hey @zzz');

      // The zero-match case has no DOM and no ARIA state — the panel is gone and
      // the field has no `aria-expanded` — so the announcement IS the whole signal.
      expect(await mention.isOpen()).toBe(false);
      expect(await mention.getActiveOptionId()).toBeNull();
      expect(await mention.getStatusMessage()).toBe('Matches available: 0');
    });

    it('empties the field on clear, taking the panel with it', async () => {
      await mention.type('hey @al');
      expect(await mention.isOpen()).toBe(true);

      await mention.clear();

      expect(await mention.getValue()).toBe('');
      expect(await mention.isOpen()).toBe(false);
    });
  });

  describe('choosing', () => {
    it('walks the suggestions with the arrows, wrapping at both ends', async () => {
      await mention.type('hey @');

      await mention.nextOption();
      expect(await mention.getActiveOptionLabel()).toBe('Alan Turing');
      expect(await mention.getActiveOptionIndex()).toBe(1);

      await mention.previousOption();
      await mention.previousOption();
      // Past the first, round to the last.
      expect(await mention.getActiveOptionIndex()).toBe(3);
      expect(await mention.getActiveOptionLabel()).toBe('Linus Torvalds');

      await mention.nextOption();
      expect(await mention.getActiveOptionIndex()).toBe(0);
    });

    it('keeps the option ARIA and the field reference telling the same story', async () => {
      await mention.type('hey @');
      await mention.nextOption();

      const [active] = await mention.getOptions({ active: true });
      const inactive = await mention.getOptions({ active: false });

      expect(await active.getText()).toBe(await mention.getActiveOptionLabel());
      expect(await active.getId()).toBe(await mention.getActiveOptionId());
      expect(await active.isActive()).toBe(true);
      // Exactly one cursor: the other three are not selected.
      expect(inactive).toHaveLength(3);
    });

    it('moves the cursor onto a hovered suggestion', async () => {
      await mention.type('hey @');
      const [, alan] = await mention.getOptions();

      await alan.hover();

      // Hover and the arrows drive the same single cursor.
      expect(await mention.getActiveOptionLabel()).toBe('Alan Turing');
      expect(await mention.getActiveOptionIndex()).toBe(1);
    });

    it('commits on Enter, inserting the mention and a trailing space', async () => {
      await mention.type('hey @al');
      await mention.commit();

      expect(await mention.getValue()).toBe('hey @Alan Turing ');

      const commit = fixture.componentInstance.committed();
      expect(commit?.item.label).toBe('Alan Turing');
      expect(commit?.trigger).toBe('@');
      expect(commit?.query).toBe('al');

      expect(await mention.isOpen()).toBe(false);
      expect(await mention.getActiveOptionId()).toBeNull();
      // Committing is otherwise silent — the panel simply vanishes.
      expect(await mention.getStatusMessage()).toBe('Inserted: Alan Turing');
    });

    it('commits on Tab as well', async () => {
      await mention.type('hey @grace');
      await mention.commitWithTab();

      expect(await mention.getValue()).toBe('hey @Grace Hopper ');
      expect(fixture.componentInstance.committed()?.item.label).toBe('Grace Hopper');
    });

    it('picks a suggestion with the mouse', async () => {
      await mention.type('hey @');

      await mention.pick({ text: 'Grace Hopper' });

      expect(await mention.getValue()).toBe('hey @Grace Hopper ');
      expect(await mention.isOpen()).toBe(false);
    });

    it('says what the panel does offer when a pick matches nothing', async () => {
      await mention.type('hey @');

      await expect(mention.pick({ text: 'Nobody' })).rejects.toThrow(/The panel offers: Ada Lovelace/);
    });

    it('dismisses on Escape without committing or touching the text', async () => {
      await mention.type('hey @al');

      // The whole keystroke, keydown AND keyup — which is the half that matters:
      // the caret is still inside the mention, so a keyup the directive re-detected
      // on would reopen the panel and the dismissal would not stick. A synthetic
      // keydown-only Escape passes either way and says nothing.
      await mention.dismiss();

      expect(await mention.isOpen()).toBe(false);
      expect(await mention.getValue()).toBe('hey @al');
      expect(fixture.componentInstance.committed()).toBeNull();
      // Idempotent: a closed panel is left alone rather than erroring.
      await mention.dismiss();
    });

    it('closes on blur, after the grace period that lets a click land', async () => {
      await mention.type('hey @al');
      expect(await mention.isFocused()).toBe(true);

      await mention.blur();

      expect(await mention.isOpen()).toBe(false);
      expect(fixture.componentInstance.committed()).toBeNull();
    });

    it('opens nothing on focus alone', async () => {
      await mention.focus();

      // Focus is not a gesture here: the panel needs a trigger char at a word
      // boundary, which is what keeps the field usable for plain prose.
      expect(await mention.isFocused()).toBe(true);
      expect(await mention.isOpen()).toBe(false);
    });
  });
});

describe('WrMentionHarness — custom display, value and filter', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CustomHost>>;
  let mention: WrMentionHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(CustomHost);
    fixture.detectChanges();
    mention = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrMentionHarness.with({ placeholder: 'Custom' })
    );
  });

  afterEach(() => fixture.destroy());

  it('offers what displayWith renders, filtered by filterWith', async () => {
    await mention.type('hey @a');

    // The labels are the items' `name`, not their `label`. And the prefix predicate
    // is doing the work: the substring default would have kept "TorvALds".
    expect(await mention.getOptionLabels()).toEqual(['Ada Lovelace', 'Alan Turing']);
    expect(await mention.getActiveOptionLabel()).toBe('Ada Lovelace');
  });

  it('inserts what valueWith returns, not what the panel showed', async () => {
    await mention.type('hey @a');

    await mention.pick({ text: 'Ada Lovelace' });

    // Panel shows the display name, the field takes the handle — the two are
    // deliberately allowed to differ, which is why the harness reads the field
    // rather than assuming the label.
    expect(await mention.getValue()).toBe('hey @ada ');
    expect(fixture.componentInstance.committed()?.item.name).toBe('Ada Lovelace');
  });
});

describe('WrMentionHarness — two fields on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads only its own panel while both fields are suggesting', async () => {
    const [fruit, veg] = await loader.getAllHarnesses(WrMentionHarness);

    // `setValue()` rather than `type()`, deliberately: typing focuses the field,
    // and focusing the second one blurs the first — which closes ITS panel. One
    // panel in a shared overlay container proves nothing about scoping.
    await fruit.setValue('hey @a');
    await veg.setValue('hey @c');

    // The single-element path…
    expect(await fruit.isOpen()).toBe(true);
    expect(await veg.isOpen()).toBe(true);
    expect(await fruit.getListboxRole()).toBe('listbox');
    // …and the list path, which is a separate query and would leak on its own.
    expect(await fruit.getOptionLabels()).toEqual(['Apple', 'Apricot']);
    expect(await veg.getOptionLabels()).toEqual(['Carrot']);
    // The active reference resolves inside the right panel too.
    expect(await fruit.getActiveOptionLabel()).toBe('Apple');
    expect(await veg.getActiveOptionLabel()).toBe('Carrot');
    expect(await fruit.getActiveOptionId()).not.toBe(await veg.getActiveOptionId());
  });

  it('closing one leaves the other suggesting', async () => {
    const [fruit, veg] = await loader.getAllHarnesses(WrMentionHarness);
    await fruit.setValue('hey @a');
    await veg.setValue('hey @c');

    await veg.dismiss();

    expect(await veg.isOpen()).toBe(false);
    expect(await fruit.isOpen()).toBe(true);
    expect(await fruit.getOptionLabels()).toEqual(['Apple', 'Apricot']);
  });

  it('narrows by placeholder, by field text and by open state', async () => {
    const veg = await loader.getHarness(WrMentionHarness.with({ placeholder: 'Veg' }));
    await veg.setValue('hey @c');

    const open = await loader.getAllHarnesses(WrMentionHarness.with({ open: true }));
    expect(await Promise.all(open.map(m => m.getPlaceholder()))).toEqual(['Veg']);

    const shut = await loader.getAllHarnesses(WrMentionHarness.with({ open: false }));
    expect(await Promise.all(shut.map(m => m.getPlaceholder()))).toEqual(['Fruit']);

    const byText = await loader.getHarness(WrMentionHarness.with({ value: /@c$/ }));
    expect(await byText.getPlaceholder()).toBe('Veg');

    const byExactText = await loader.getAllHarnesses(WrMentionHarness.with({ value: 'hey @c' }));
    expect(await Promise.all(byExactText.map(m => m.getPlaceholder()))).toEqual(['Veg']);
  });

  it('refuses to read the live region when it cannot tell whose it is', async () => {
    const [fruit] = await loader.getAllHarnesses(WrMentionHarness);
    await fruit.setValue('hey @a');

    // Two fields park two regions on `<body>`, and neither names the field it
    // belongs to. Answering with whichever came first is the leak this refusal
    // exists to prevent — the announcement is assertable with one field mounted.
    await expect(fruit.getStatusMessage()).rejects.toThrow(/2 mention live regions/);
  });
});
