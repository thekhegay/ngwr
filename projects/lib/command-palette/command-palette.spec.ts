import { ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCommandPalette } from './command-palette';
import type { WrCommandItem } from './interfaces';

/**
 * Two groups, interleaved in SOURCE order on purpose: `bucketize` collects each
 * group as it first appears, so the rendered order is Open, Save, Undo while the
 * source order is Open, Undo, Save. Any list that is flattened the other way
 * round disagrees with the screen.
 */
const ITEMS: readonly WrCommandItem[] = [
  { id: 'open', label: 'Open file', group: 'File' },
  { id: 'undo', label: 'Undo', group: 'Edit' },
  { id: 'save', label: 'Save file', group: 'File' },
];

@Component({
  imports: [WrCommandPalette],
  template: `
    <wr-command-palette
      [items]="items()"
      [(open)]="open"
      [trigger]="null"
      [responsive]="responsive()"
      (picked)="picked.push($event.id)"
    />
  `,
})
class Host {
  readonly items = signal<readonly WrCommandItem[]>(ITEMS);
  readonly open = signal(true);
  readonly responsive = signal<boolean | undefined>(undefined);
  readonly picked: string[] = [];
}

/**
 * The palette is a listbox driven entirely from the input: the options are not
 * focusable, so `aria-activedescendant` and the `--active` class are the only
 * things telling anyone where they are. That makes the ORDER those two agree on
 * the whole contract — and it is the order on screen, not the order the items
 * arrived in.
 *
 * `trigger` is `null` throughout: the default binds `mod+k` globally through
 * `WrHotkey`, and a spec that leaves it bound is registering a document listener
 * for every later file in the run.
 */
describe('WrCommandPalette', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const options = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="option"]')];
  const labels = (): string[] =>
    options().map(el => el.querySelector('.wr-command-palette__option-label')!.textContent.trim());
  const activeIndex = (): number =>
    options().findIndex(el => el.classList.contains('wr-command-palette__option--active'));
  const activeDescendant = (): string | null => input().getAttribute('aria-activedescendant');

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  const type = (text: string): void => {
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    // jsdom does not implement `scrollIntoView` at all, so the component's call
    // would throw. Teaching the prototype about it here keeps production code free
    // of a guard that exists only for the test environment.
    Element.prototype.scrollIntoView = (): undefined => undefined;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('renders the commands grouped, in the order the groups first appear', () => {
    expect(labels()).toEqual(['Open file', 'Save file', 'Undo']);
    const titles = [...root().querySelectorAll('.wr-command-palette__group-title')].map(el => el.textContent.trim());
    expect(titles).toEqual(['File', 'Edit']);
  });

  it('names the input as a combobox pointing at the list it controls', () => {
    const listbox = root().querySelector('[role="listbox"]')!;
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(input().getAttribute('aria-controls')).toBe(listbox.getAttribute('id'));
  });

  it('starts on the first option and says so', () => {
    expect(activeIndex()).toBe(0);
    expect(activeDescendant()).toBe(options()[0].getAttribute('id'));
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('walks the options in the order they are rendered', () => {
    // The bug this stands for: navigation used the flat SOURCE order while the
    // template rendered the grouped order, so one press of ArrowDown jumped the
    // highlight from the first row to the THIRD and skipped the one between.
    press('ArrowDown');
    expect(activeIndex()).toBe(1);
    expect(activeDescendant()).toBe(options()[1].getAttribute('id'));

    press('ArrowDown');
    expect(activeIndex()).toBe(2);

    // And wraps.
    press('ArrowDown');
    expect(activeIndex()).toBe(0);
    press('ArrowUp');
    expect(activeIndex()).toBe(2);
  });

  it('jumps to the ends with Home and End', () => {
    press('End');
    expect(activeIndex()).toBe(2);
    press('Home');
    expect(activeIndex()).toBe(0);
  });

  it('picks the option that is actually highlighted', () => {
    // Enter read the same mis-ordered list, so it fired the command one row below
    // the one the user could see was selected.
    press('ArrowDown');
    expect(labels()[activeIndex()]).toBe('Save file');

    press('Enter');
    expect(fixture.componentInstance.picked).toEqual(['save']);
  });

  it('follows the pointer as well as the keyboard', () => {
    options()[2].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
    expect(activeIndex()).toBe(2);

    options()[2].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.picked).toEqual(['undo']);
  });

  it('filters on the label, the description, the group and the keywords', () => {
    fixture.componentInstance.items.set([
      { id: 'a', label: 'Alpha', description: 'the first letter' },
      { id: 'b', label: 'Beta', group: 'Greek' },
      { id: 'c', label: 'Gamma', keywords: ['third'] },
    ]);
    fixture.detectChanges();

    type('first');
    expect(labels()).toEqual(['Alpha']);
    type('greek');
    expect(labels()).toEqual(['Beta']);
    type('third');
    expect(labels()).toEqual(['Gamma']);
  });

  it('says so when nothing matches, instead of showing an empty list', () => {
    type('zzzz');
    expect(options()).toEqual([]);
    expect(root().querySelector('.wr-command-palette__empty')).not.toBeNull();
  });

  it('keeps the "no results" row out of the listbox', () => {
    type('zzzz');
    const listbox = root().querySelector<HTMLElement>('[role="listbox"]')!;
    const empty = root().querySelector<HTMLElement>('.wr-command-palette__empty')!;

    // A listbox may own only `option` and `group` children — the rule the buckets
    // already follow — so this row inside it was an axe `aria-required-children`
    // critical, in the one state it renders in. A listbox with no children at all
    // is allowed, which is what is left behind.
    expect(listbox.contains(empty)).toBe(false);
    expect(listbox.children).toHaveLength(0);
    // Focus stays in the search input while the query is typed, so nothing would
    // read the row out unless it is a live region.
    expect(empty.getAttribute('role')).toBe('status');
  });

  it('sends the highlight back to the top on every keystroke', () => {
    press('End');
    expect(activeIndex()).toBe(2);
    type('file');
    expect(activeIndex()).toBe(0);
  });

  it('pulls the highlight back when the list shrinks under it', () => {
    press('End');
    expect(activeIndex()).toBe(2);

    // Shrinking the list from the OUTSIDE — no keystroke resets the index here, so
    // only the clamp keeps `aria-activedescendant` pointing at something real.
    fixture.componentInstance.items.set([ITEMS[0]]);
    fixture.detectChanges();

    expect(activeIndex()).toBe(0);
    expect(activeDescendant()).toBe(options()[0].getAttribute('id'));
  });

  it('closes on Escape and stops rendering the panel', () => {
    press('Escape');
    expect(fixture.componentInstance.open()).toBe(false);
    expect(root().querySelector('[role="listbox"]')).toBeNull();
  });

  it('leaves keys it does not own alone', () => {
    const event = press('a');
    expect(event.defaultPrevented).toBe(false);
  });

  it('puts the caret in the search box once the panel exists', async () => {
    // Deferred with `queueMicrotask`, which AGENTS.md warns about — but the warning
    // is about a microtask queued from an EVENT HANDLER, where change detection is
    // still a pending macrotask. This one is queued from an effect that already runs
    // inside change detection, so it lands after the panel is in the DOM. Pinned
    // because the distinction is easy to lose in a refactor.
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    await Promise.resolve();
    expect(document.activeElement).toBe(input());
  });

  it('keeps the highlighted option on screen', () => {
    // The body is a fixed-height scroller and the options are not focusable, so the
    // browser moves nothing on its own: the arrows used to walk the highlight off
    // the bottom edge and out of sight.
    const spies = options().map(el => {
      const spy = vi.fn();
      el.scrollIntoView = spy;
      return spy;
    });

    press('ArrowDown');
    expect(spies[1]).toHaveBeenCalledWith({ block: 'nearest' });
    expect(spies[0]).not.toHaveBeenCalled();

    press('End');
    expect(spies[2]).toHaveBeenCalled();
  });

  it('leaves the scroll position alone when the pointer is what moved', () => {
    // Scrolling on hover would fight the pointer that caused the hover.
    const spy = vi.fn();
    options()[2].scrollIntoView = spy;

    options()[2].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();

    expect(activeIndex()).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('owns only children a listbox is allowed to own', () => {
    // A titled bucket is a labelled `group`; the wrapper around ungrouped items
    // leaves the tree with `role="none"` so its options belong to the listbox
    // directly. A role-less div in between is a child ARIA has no rule for.
    const groups = [...root().querySelectorAll<HTMLElement>('.wr-command-palette__group')];
    expect(groups.length).toBe(2);
    for (const group of groups) {
      expect(group.getAttribute('role')).toBe('group');
      const labelledBy = group.getAttribute('aria-labelledby')!;
      expect(root().querySelector(`#${labelledBy}`)!.textContent.trim()).toBe(
        group.querySelector('.wr-command-palette__group-title')!.textContent.trim()
      );
    }

    fixture.componentInstance.items.set([{ id: 'plain', label: 'No group' }]);
    fixture.detectChanges();
    const bare = root().querySelector<HTMLElement>('.wr-command-palette__group')!;
    expect(bare.getAttribute('role')).toBe('none');
    expect(bare.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('keeps what the user typed when the presentation changes under it', () => {
    // The reset-on-open effect used to read `responsive()` as well, so a bound
    // signal flipping mid-search re-ran the whole body and cleared the query.
    type('file');
    expect(labels()).toEqual(['Open file', 'Save file']);

    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();

    expect(input().value).toBe('file');
    expect(labels()).toEqual(['Open file', 'Save file']);
  });

  it('still resets the search on each fresh opening', () => {
    type('file');
    press('Escape');
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(input().value).toBe('');
    expect(labels()).toEqual(['Open file', 'Save file', 'Undo']);
  });

  /**
   * jsdom runs no input method, so every event below is hand-built with the flags
   * a real one sets: `isComposing` while a candidate window is open, and the
   * legacy `keyCode: 229` that Safari leaves on the keystroke which commits a
   * candidate (it fires `compositionend` first, so `isComposing` has already gone
   * false there). The assertion is that the handler did NOTHING.
   *
   * That is a faithful test of the guard and of nothing more. It does not run
   * kotoeri, Pinyin or Google Japanese Input, and it must not be read as saying
   * the palette has been tried under a real IME — only that a keydown wearing an
   * IME's flags is left alone.
   */
  describe('IME composition', () => {
    const compose = (key: string): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: true });
      input().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    it('leaves the arrows to the candidate list', () => {
      const event = compose('ArrowDown');
      expect(event.defaultPrevented, 'the IME needs the key to walk its candidates').toBe(false);
      expect(activeIndex()).toBe(0);
    });

    it('does not run a command on the Enter that accepts a candidate', () => {
      type('save');
      const event = compose('Enter');
      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.picked).toEqual([]);
      expect(fixture.componentInstance.open()).toBe(true);
    });

    it('stays open on the Escape that cancels a conversion, query intact', () => {
      // The reproduced blocker: Escape means "undo this reading" to the IME, and
      // the palette took it as "close", discarding everything typed so far.
      type('こうかい');
      const event = compose('Escape');
      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.open()).toBe(true);
      expect(input().value).toBe('こうかい');
    });

    it("recognises Safari's committing keystroke, which carries only keyCode 229", () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, keyCode: 229 });
      input().dispatchEvent(event);
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toBe(true);
    });

    it('acts on the same keys again once the composition is over', () => {
      press('ArrowDown');
      expect(activeIndex()).toBe(1);
      press('Escape');
      expect(fixture.componentInstance.open()).toBe(false);
    });
  });
});

/**
 * Teardown while open is its own case: the trap is destroyed in the CLOSE branch
 * of the open effect, which never runs when the component goes away first — so a
 * live `ConfigurableFocusTrap` was left holding a detached panel.
 */
describe('WrCommandPalette teardown', () => {
  it('destroys its focus trap when it is destroyed while open', async () => {
    const destroy = vi.fn();
    const create = vi.fn(() => ({
      destroy,
      focusInitialElementWhenReady: () => Promise.resolve(true),
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ConfigurableFocusTrapFactory, useValue: { create } }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    // The trap is built in a microtask, after the panel exists.
    await Promise.resolve();
    expect(create).toHaveBeenCalledTimes(1);

    fixture.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  /**
   * The same case one tick earlier — destroyed in the task that opened it, before
   * the microtask that builds the trap has run. The destroy hook fires FIRST and
   * has nothing to destroy; the continuation then builds a trap on a panel Angular
   * has already detached, and a `ConfigurableFocusTrap` plants two anchor elements
   * in it and holds them, so that is retained DOM rather than a stray object.
   */
  it('builds no focus trap when it is destroyed in the task that created it', async () => {
    const destroy = vi.fn();
    const create = vi.fn(() => ({
      destroy,
      focusInitialElementWhenReady: () => Promise.resolve(true),
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ConfigurableFocusTrapFactory, useValue: { create } }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.destroy();
    await Promise.resolve();

    expect(create, 'a trap was built after teardown, so nothing is left to destroy it').not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });
});

/**
 * The key-cap chip beside the search field.
 *
 * `<kbd>esc</kbd>` was a literal in the template, and the one string on this
 * component no catalog could reach: under the audit's pseudo-locale everything
 * around it resolved to a key and this stayed Latin — a Russian palette with a
 * Russian placeholder, a Russian accessible name and an English hint.
 */
describe('WrCommandPalette — the esc hint is localizable', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const hint = (): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-command-palette__hint')!.textContent.trim();

  afterEach(() => fixture.destroy());

  it('keeps its English key name when nothing is configured', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(hint()).toBe('esc');
  });

  it('takes the label from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
        provideWrI18nStaticLoader({ xx: { commandPalette: { escHint: 'Esc-Taste' } } }),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // The static loader resolves through a promise even for an in-memory catalog,
    // which is why this reads a signal rather than a string fixed at construction.
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(hint()).toBe('Esc-Taste');
  });
});

/**
 * The palette was a closed box until v14.1: `items` in, `picked` out, and a
 * substring filter in between that nothing could reach. That is fine for a
 * fixed command list and impossible for anything backed by a server — which is
 * what ngwr.dev's own docs search needs.
 *
 * The three pieces below are `wr-select`'s vocabulary, name for name, because
 * this is the same problem and the library should not spell it twice: `query`
 * is two-way, `serverSearch` says the list arrived pre-scoped, and
 * `searchChange` fires on a debounce rather than per keystroke.
 */
describe('WrCommandPalette backed by a server', () => {
  @Component({
    imports: [WrCommandPalette],
    template: `
      <wr-command-palette
        [items]="items()"
        [(open)]="open"
        [trigger]="null"
        [(query)]="query"
        [serverSearch]="serverSearch()"
        [loading]="loading()"
        [debounceMs]="debounceMs()"
        (searchChange)="searches.push($event)"
      />
    `,
  })
  class ServerHost {
    readonly items = signal<readonly WrCommandItem[]>(ITEMS);
    readonly open = signal(true);
    readonly query = signal('');
    readonly serverSearch = signal(true);
    readonly loading = signal(false);
    readonly debounceMs = signal(0);
    readonly searches: string[] = [];
  }

  let fixture: ReturnType<typeof TestBed.createComponent<ServerHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const options = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="option"]')];
  const status = (): HTMLElement | null => root().querySelector<HTMLElement>('[role="status"]');

  const type = (value: string): void => {
    input().value = value;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ConfigurableFocusTrapFactory, provideWrI18n(), provideWrI18nStaticLoader({})],
    });
    fixture = TestBed.createComponent(ServerHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps every row a server returned, however little it looks like the query', () => {
    // The whole point of the flag. A backend that ranks or tolerates typos hands
    // back rows whose labels do not contain the query at all — "loadnig" really
    // does return the loading bar — and the client filter would hide them again.
    type('zzzz');

    expect(options()).toHaveLength(ITEMS.length);
  });

  it('still filters locally when the host has not claimed the list is scoped', () => {
    fixture.componentInstance.serverSearch.set(false);
    fixture.detectChanges();

    type('zzzz');

    expect(options()).toHaveLength(0);
  });

  it('carries the query both ways, so a host can seed it and read it', () => {
    fixture.componentInstance.query.set('table');
    fixture.detectChanges();
    expect(input().value).toBe('table');

    type('tree');
    expect(fixture.componentInstance.query()).toBe('tree');
  });

  it('says it is searching rather than saying there is nothing', () => {
    fixture.componentInstance.items.set([]);
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    // A real query, so the silent "nothing asked yet" state is not what is
    // under test here — this is about the row that shows once one has been.
    type('zzzz');

    // The distinction is the point: an async palette that reports "No results"
    // between every keystroke and its answer states something that is not true
    // yet. Both rows are the same live region, so a screen reader hears the
    // correction rather than a false claim it has to un-learn.
    expect(status()!.textContent.trim()).toBe('Searching…');

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(status()!.textContent.trim()).toBe('No results');
  });

  it('reports nothing missing until something has been asked', () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();

    // Open, empty, no items — and silent. The client-filtered palette cannot
    // reach this state (an empty query matches everything), so the empty row was
    // only ever written for a list that had been searched.
    expect(status()).toBeNull();

    type('zzzz');
    expect(status()!.textContent.trim()).toBe('No results');
  });

  it('emits the settled query, not one event per keystroke', async () => {
    fixture.componentInstance.debounceMs.set(40);
    fixture.detectChanges();

    type('s');
    type('se');
    type('sel');

    expect(fixture.componentInstance.searches).toEqual([]);

    await new Promise(resolve => setTimeout(resolve, 80));
    expect(fixture.componentInstance.searches).toEqual(['sel']);
  });

  it('does not emit the empty query it is mounted with', async () => {
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(fixture.componentInstance.searches).toEqual([]);
  });
});
