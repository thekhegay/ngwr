/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ConfigurableFocusTrap, ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { debounce, skip, timer } from 'rxjs';

import { WrHotkey, type WrHotkeyHandle, type WrHotkeySpec } from 'ngwr/hotkey';
import { readI18nText, useI18nText } from 'ngwr/i18n';
import { WrIcon } from 'ngwr/icon';
import { WR_RESPONSIVE_OVERLAYS, wrPresentAsSheet } from 'ngwr/overlay';
import { isComposing } from 'ngwr/utils';

import type { WrCommandItem } from './interfaces';

interface Bucket {
  readonly title: string | null;
  readonly items: readonly WrCommandItem[];
}

let listboxUid = 0;

function bucketize(items: readonly WrCommandItem[]): readonly Bucket[] {
  const map = new Map<string | null, WrCommandItem[]>();
  for (const item of items) {
    const key = item.group ?? null;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].map(([title, items]) => ({ title, items }));
}

function matches(item: WrCommandItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.description?.toLowerCase().includes(q)) return true;
  if (item.group?.toLowerCase().includes(q)) return true;
  if (item.keywords?.some(k => k.toLowerCase().includes(q))) return true;
  return false;
}

/**
 * `⌘K`-style command palette — a centred modal with a search input and
 * filtered list of actions. Items can be grouped, have icons, descriptions,
 * and visual shortcut hints.
 *
 * Drop one at the root of the app, pass it the list of commands, and bind
 * a global hotkey (default `'mod+k'`). Use `[(open)]` for controlled
 * visibility, or let it manage itself.
 *
 * @example
 * ```html
 * <wr-command-palette [items]="commands" trigger="mod+k" (picked)="onPicked($event)" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/command-palette
 */
@Component({
  selector: 'wr-command-palette',
  templateUrl: './command-palette.html',
  encapsulation: ViewEncapsulation.None,
  imports: [WrIcon],
})
export class WrCommandPalette {
  /** Accessible name. Falls back to `commandPalette.label`, then `'Command palette'`. */
  readonly paletteLabel = input<string | null>(null);

  protected readonly resolvedPaletteLabel = useI18nText(this.paletteLabel, 'commandPalette.label', 'Command palette');

  /** Items shown in the palette. */
  readonly items = input<readonly WrCommandItem[]>([]);

  /** Controlled open state (two-way bindable). @default false */
  readonly open = model(false);

  /** Global hotkey that opens the palette. `null` disables auto-binding. @default 'mod+k' */
  readonly trigger = input<WrHotkeySpec | null>('mod+k');

  /** Search input placeholder. Falls back to `commandPalette.placeholder`. */
  readonly placeholder = input<string | null>(null);

  /** Text shown when no items match. Falls back to `commandPalette.noResults`. */
  readonly emptyText = input<string | null>(null);

  /**
   * Overrides the `commandPalette.loading` catalog string, shown instead of
   * {@link emptyText} while {@link loading} is true.
   */
  readonly loadingText = input<string | null>(null);

  protected readonly resolvedPlaceholder = useI18nText(
    this.placeholder,
    'commandPalette.placeholder',
    'Type a command or search…'
  );
  protected readonly resolvedEmpty = useI18nText(this.emptyText, 'commandPalette.noResults', 'No results');
  protected readonly resolvedLoading = useI18nText(this.loadingText, 'commandPalette.loading', 'Searching…');

  /**
   * The key-cap chip beside the search field. It was the literal `esc` in the
   * template — the one string on this component no catalog could reach, so a
   * fully Russian palette still hinted in English.
   */
  protected readonly resolvedEscHint = readI18nText('commandPalette.escHint', 'esc');

  /** Auto-close on `(picked)`. Set false to keep open. @default true */
  readonly closeOnPick = input(true, { transform: coerceBooleanProperty });

  /**
   * Present the palette full-screen on small viewports instead of a centred
   * modal. `undefined` follows the app-wide `provideWrResponsiveOverlays()`
   * setting; `true`/`false` overrides it. The palette docks to the top (it
   * auto-focuses its input, so the on-screen keyboard stays clear).
   * @default undefined
   */
  readonly responsive = input<boolean | undefined, BooleanInput>(undefined, {
    transform: (v: BooleanInput): boolean | undefined => (v == null ? undefined : coerceBooleanProperty(v)),
  });

  /** Fires when the user commits an item (Enter / click). */
  readonly picked = output<WrCommandItem>();

  /**
   * The search text. Two-way, so a host can seed it, clear it, or read what the
   * user is looking for — the palette used to keep this to itself, which is what
   * made it impossible to back with anything but a static `items` array.
   *
   * Writing it does NOT re-run a host's search on its own: the debounced
   * {@link searchChange} output is what fires, on exactly the cadence
   * {@link debounceMs} sets.
   */
  readonly query = model('');

  /**
   * The item list is already scoped to the query upstream — skip the built-in
   * client-side filter. Set it when `[items]` is fed from a server via the
   * {@link searchChange} output.
   *
   * Without this, a backend that ranks or tolerates typos (returning rows whose
   * labels do not literally contain the query) would have those rows hidden
   * again on the client — the same rule `wr-select` follows, and the same
   * reason. @default false
   */
  readonly serverSearch = input(false, { transform: coerceBooleanProperty });

  /**
   * A host-driven search is in flight. Swaps the empty row for
   * {@link loadingText} — an async palette that says "No results" between every
   * keystroke and its answer is stating something false. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * How long the query must settle before {@link searchChange} fires, in ms.
   * A search request per keystroke is what exhausts a metered search backend:
   * typing `select` is six requests at 0 and roughly one at 250. @default 250
   */
  readonly debounceMs = input(250, { transform: (v: unknown): number => Math.max(0, Number(v) || 0) });

  /**
   * The settled query. This is the hook for a server-backed palette: dispatch
   * on it, then feed the result into `[items]` with `[serverSearch]` set.
   *
   * Fires on the {@link debounceMs} cadence, NOT per keystroke — `queryChange`
   * is the per-keystroke signal if that is what you want.
   */
  readonly searchChange = output<string>();

  protected readonly activeIndex = signal(0);

  /** Whether the current opening is presented full-screen. Decided on open. */
  protected readonly presentAsSheet = signal(false);
  protected readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('input');
  protected readonly panelEl = viewChild<ElementRef<HTMLElement>>('panel');

  /** Listbox id (referenced by the input's `aria-controls`). */
  protected readonly listboxId = `wr-command-palette-listbox-${++listboxUid}`;

  /** @internal Build a stable option id for a given flat index. */
  protected optionId(i: number): string {
    return `${this.listboxId}-opt-${i}`;
  }

  /**
   * A `role="listbox"` may only own `option` and `group` children, so a titled
   * bucket becomes a labelled group and an untitled one drops out of the tree
   * entirely — leaving its options as the listbox's own children rather than as
   * role-less wrappers ARIA has no rule for.
   */
  protected groupTitleId(index: number): string {
    return `${this.listboxId}-group-${index}`;
  }

  /** Id of the active option for `aria-activedescendant`. */
  protected readonly activeOptionId = computed<string | null>(() => {
    const i = this.activeIndex();
    return i >= 0 && i < this.filtered().length ? this.optionId(i) : null;
  });

  private readonly hotkeys = inject(WrHotkey);
  private readonly responsiveConfig = inject(WR_RESPONSIVE_OVERLAYS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private bindingHandle: WrHotkeyHandle | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;
  private previouslyFocused: HTMLElement | null = null;

  /**
   * The open branch below builds the trap inside a `queueMicrotask`, so a
   * palette destroyed while open — in the same task that opened it — runs its
   * destroy hook first and then constructs a fresh trap nothing will ever
   * destroy. A `ConfigurableFocusTrap` plants two anchor elements in the panel
   * and holds it, so that is retained DOM, not just a stray object.
   */
  private destroyed = false;

  /** Whether this palette filters `items` itself. */
  protected readonly clientFilter = computed(() => !this.serverSearch());

  /** Grouped view — what the template renders. */
  protected readonly buckets = computed<readonly Bucket[]>(() =>
    bucketize(this.clientFilter() ? this.items().filter(item => matches(item, this.query())) : this.items())
  );

  /**
   * Flat list in RENDER order — what keyboard navigation walks, and what every
   * index in this component means. Derived FROM the buckets rather than from the
   * filter: `bucketize` collects each group as it first appears, so a flat
   * source-order list disagrees with the screen the moment two groups interleave.
   * It did, and one ArrowDown moved the highlight two rows while Enter fired the
   * command below the one that looked selected.
   */
  protected readonly filtered = computed<readonly WrCommandItem[]>(() =>
    this.buckets().flatMap(bucket => bucket.items)
  );

  constructor() {
    // The settled query, for a host-driven search. `debounce(() => timer(...))`
    // rather than `debounceTime(this.debounceMs())`: this runs in the
    // constructor, where inputs are not bound yet, so reading the input eagerly
    // would pin the delay to the default and ignore `[debounceMs]` for good.
    //
    // `skip(1)` sits BEFORE the debounce so it drops the mount-time replay of
    // the empty query and nothing else. Downstream it would instead drop the
    // first SETTLED emission — and when a fast typist's opening keystrokes
    // coalesce with that initial `''`, the dropped emission is their query.
    //
    // Both rules are `wr-select`'s, arrived at there the hard way; this is the
    // same pipeline minus the async loader, which the palette does not own.
    toObservable(this.query)
      .pipe(
        skip(1),
        debounce(() => timer(this.debounceMs())),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(query => this.searchChange.emit(query));

    // Bind / re-bind the global trigger whenever the spec changes.
    effect(() => {
      this.bindingHandle?.unbind();
      const spec = this.trigger();
      if (!spec) return;
      this.bindingHandle = this.hotkeys.bind(
        spec,
        event => {
          // CLAIM the chord, and the distinction is the whole point: the
          // `preventDefault` OPTION suppresses the browser, while a handler
          // calling `preventDefault()` is how `WrHotkey` is documented to learn
          // that a binding took the chord and the lower-priority ones should be
          // skipped. A palette that only toggled left the chord unclaimed, so
          // two palettes on one page would both open on `mod+k`.
          event.preventDefault();
          this.open.update(v => !v);
        },
        { allowInInput: true }
      );
    });

    // Reset query + active index whenever we open.
    effect(() => {
      if (!this.open()) return;
      this.query.set('');
      this.activeIndex.set(0);
    });

    // Sheet presentation, kept OUT of the reset above: reading `responsive()` there
    // made the reset depend on it, so a `[responsive]` bound to a signal that
    // flipped while the palette was open wiped whatever the user had typed.
    effect(() => {
      this.presentAsSheet.set(wrPresentAsSheet(this.responsive(), this.responsiveConfig));
    });

    // Focus trap + restore.
    effect(() => {
      if (!this.isBrowser) return;
      if (this.open()) {
        const active = document.activeElement;
        this.previouslyFocused = active instanceof HTMLElement ? active : null;
        queueMicrotask(() => {
          if (this.destroyed) return;
          const host = this.panelEl()?.nativeElement;
          if (!host) return;
          this.focusTrap?.destroy();
          this.focusTrap = this.focusTrapFactory.create(host);
          void this.focusTrap.focusInitialElementWhenReady();
        });
      } else {
        this.focusTrap?.destroy();
        this.focusTrap = null;
        const restore = this.previouslyFocused;
        this.previouslyFocused = null;
        if (restore && typeof restore.focus === 'function') restore.focus();
      }
    });

    afterNextRender(() => {
      if (this.open()) this.inputEl()?.nativeElement.focus();
    });

    // Auto-focus the input when opened.
    effect(() => {
      if (!this.open()) return;
      queueMicrotask(() => this.inputEl()?.nativeElement.focus());
    });

    // Clamp the active index when the filtered list shrinks.
    effect(() => {
      const max = Math.max(0, this.filtered().length - 1);
      if (this.activeIndex() > max) this.activeIndex.set(max);
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.bindingHandle?.unbind();
      // The trap is torn down in the close branch of the effect above, which never
      // runs when the component itself goes away while still open — leaving a live
      // trap holding the removed panel and its document listeners.
      this.focusTrap?.destroy();
      this.focusTrap = null;
    });
  }

  // Template handlers

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Every key below belongs to the input method while it is converting: Enter
    // accepts a candidate, Escape cancels the conversion, the arrows walk the
    // candidate list. Acting on them closed the palette — and threw the query
    // away — the first time a Japanese user pressed Escape to undo a reading.
    if (isComposing(event)) return;

    const list = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (list.length > 0) this.activeIndex.set((this.activeIndex() + 1) % list.length);
        this.revealActive();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (list.length > 0) this.activeIndex.set((this.activeIndex() - 1 + list.length) % list.length);
        this.revealActive();
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        this.revealActive();
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(Math.max(0, list.length - 1));
        this.revealActive();
        break;
      case 'Enter': {
        event.preventDefault();
        const item = list[this.activeIndex()];
        if (item) this.commit(item);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  }

  protected onBackdropClick(): void {
    this.close();
  }

  protected onItemClick(item: WrCommandItem, event: MouseEvent): void {
    event.preventDefault();
    this.commit(item);
  }

  protected onItemHover(item: WrCommandItem): void {
    const i = this.filtered().indexOf(item);
    if (i >= 0) this.activeIndex.set(i);
  }

  /** Flat index of an item within the filtered list — for highlight checks. */
  protected indexOf(item: WrCommandItem): number {
    return this.filtered().indexOf(item);
  }

  // Public API

  /** Open the palette. */
  show(): void {
    this.open.set(true);
  }

  /** Close the palette. */
  close(): void {
    this.open.set(false);
  }

  // Internals

  /**
   * Keep the highlighted option on screen. The body is a fixed-height scroller and
   * the options are not focusable, so nothing moves it on the browser's behalf —
   * arrow keys walked the highlight straight off the bottom and out of sight.
   * Keyboard only: doing it on hover would fight the pointer that caused it.
   * `wr-select` and `wr-tree` keep the same promise through their own
   * `ensureVisible`; theirs is index maths because they are virtualized.
   */
  private revealActive(): void {
    if (!this.isBrowser) return;
    const id = this.activeOptionId();
    if (!id) return;
    // Ids are position-based and stable, so the element is findable straight away —
    // no need to wait for change detection to re-mark the active row.
    this.panelEl()?.nativeElement.querySelector<HTMLElement>(`#${id}`)?.scrollIntoView({ block: 'nearest' });
  }

  private commit(item: WrCommandItem): void {
    item.action?.();
    this.picked.emit(item);
    if (this.closeOnPick()) this.close();
  }
}
