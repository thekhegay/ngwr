/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type BooleanInput, coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import type { FormValueControl } from '@angular/forms/signals';

import { type Observable, debounce, finalize, from, isObservable, of, skip, switchMap, tap, timer } from 'rxjs';

import { useConfigValue } from 'ngwr/config';
import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WR_OVERLAY, WR_RESPONSIVE_OVERLAYS, WrOutsideClick, wrPresentAsSheet } from 'ngwr/overlay';

import type { WrSelectMode, WrSelectSearchLoader, WrSelectTagValidator, WrSelectSize } from './interfaces';
import { WrOption } from './option';
import { WR_SELECT, type WrSelectContext, type WrSelectOptionRegistration } from './tokens';

let listboxUid = 0;

interface SelectedChip {
  readonly value: unknown;
  readonly label: string;
}

/**
 * Combobox primitive. Renders a button that opens a CDK overlay
 * containing the projected `<wr-option>` (and optionally
 * `<wr-option-group>`) children. Every shape is the same component
 * with a different `[mode]`:
 *
 * - `'single'` (default) — one value, no input. Classic dropdown.
 * - `'multi'` — array value, chips on the trigger; clicking an option
 *   toggles instead of closing, Backspace removes the last chip.
 * - `'search'` — type-ahead with sync `[options]` filter or async
 *   `[loader]`. Replaces the standalone `<wr-autocomplete>`.
 * - `'tag'` — free-text + chips with `[separators]` / `[validate]` /
 *   `[allowDuplicates]`. Replaces `<wr-chips-input>`.
 *
 * `[searchable]` is orthogonal to the mode — it adds the type-ahead filter to
 * `single` / `multi` without changing the value shape, which is how you get a
 * searchable multi-select. Server-side search hangs off the `(searchChange)` output
 * plus `[options]` / `[loading]`.
 *
 * A signal-forms native control: it implements `FormValueControl<unknown>`, so
 * `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone, and classic
 * `[(ngModel)]` / reactive forms keep working through Angular's bridge.
 *
 * @example
 * ```html
 * <!-- Single (signal forms) -->
 * <wr-select placeholder="Pick a size" [formField]="form.size">
 *   <wr-option value="sm">Small</wr-option>
 *   <wr-option value="md">Medium</wr-option>
 *   <wr-option value="lg">Large</wr-option>
 * </wr-select>
 *
 * <!-- Multi (standalone two-way binding) -->
 * <wr-select mode="multi" placeholder="Pick tags" [(value)]="tags">
 *   <wr-option value="ts">TypeScript</wr-option>
 *   <wr-option value="ng">Angular</wr-option>
 * </wr-select>
 *
 * <!-- Multi + type-ahead, options from a store -->
 * <wr-select
 *   mode="multi"
 *   searchable
 *   [options]="results()"
 *   [loading]="pending()"
 *   [(value)]="categories"
 *   (searchChange)="store.search($event)"
 * />
 * ```
 *
 *
 * @see https://ngwr.dev/reference/components/select
 */
@Component({
  selector: 'wr-select',
  templateUrl: './select.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrOption],
  providers: [
    {
      provide: WR_SELECT,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSelect),
    },
  ],
})
export class WrSelect implements FormValueControl<unknown>, WrSelectContext {
  /** Placeholder shown when no option is selected. Falls back to `select.placeholder`. */
  readonly placeholder = input<string | null>(null);

  /** Clear-selection (×) button aria-label. Falls back to `select.clearSelection`. */
  readonly clearLabel = input<string | null>(null);

  protected readonly resolvedPlaceholder = useI18nText(this.placeholder, 'select.placeholder', '');
  protected readonly resolvedClear = useI18nText(this.clearLabel, 'select.clearSelection', 'Clear selection');

  /**
   * Accessible name of the trigger. Falls back to the placeholder, then to
   * `select.label` — `role="combobox"` on an empty trigger otherwise has no name
   * at all, which is the common case before anything is selected.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly labelText = useI18nText(this.ariaLabel, 'select.label', 'Select');
  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty placeholder must fall through to the catalog string.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    const placeholder = this.resolvedPlaceholder();
    return placeholder ? placeholder : this.labelText();
  });

  /** Per-chip ARIA label — interpolates `{{label}}`. @internal */
  protected readonly chipRemoveLabel = useI18nFormatter('select.removeItem', 'Remove {{label}}');

  /**
   * Disable the select. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Pill-shaped corners on the trigger. Unset falls back to the `select.rounded`
   * app default from `provideWrConfig()`; `[rounded]="false"` turns a configured
   * `true` back off. @default false
   */
  readonly rounded = input<boolean | null, BooleanInput>(null, {
    // Null-preserving, like `responsive` below: the plain `coerceBooleanProperty`
    // folds `null` into `false`, which would make "not set" and "set to false"
    // the same value — and a config default nothing could ever supply.
    transform: (v: BooleanInput): boolean | null => (v == null ? null : coerceBooleanProperty(v)),
  });

  /**
   * Control size — shares the `--wr-control-*` contract. Unset falls back to the
   * `select.size` app default from `provideWrConfig()`. @default 'md'
   */
  readonly size = input<WrSelectSize | null>(null);

  /** `rounded`, then the app config, then `false`. @internal */
  protected readonly resolvedRounded = useConfigValue(this.rounded, c => c.select?.rounded, false);

  /**
   * `size`, then the app config, then `md`. Read by the trigger's host classes AND
   * by the overlay panel, which builds its size modifier separately.
   */
  protected readonly resolvedSize = useConfigValue(this.size, c => c.select?.size, 'md');

  /**
   * Present the option panel as a full-width bottom-sheet on small
   * viewports instead of an anchored dropdown. `undefined` follows the
   * app-wide `provideWrResponsiveOverlays()` setting; `true`/`false`
   * overrides it. @default undefined
   */
  readonly responsive = input<boolean | undefined, BooleanInput>(undefined, {
    transform: (v: BooleanInput): boolean | undefined => (v == null ? undefined : coerceBooleanProperty(v)),
  });

  /**
   * Behavior mode. `<wr-select>` is the unified combobox primitive —
   * pick the shape via `[mode]`:
   *
   * - `'single'` (default) — one value, no input. Classic dropdown.
   * - `'multi'` — array value, chips on the trigger.
   * - `'search'` — type-ahead with sync filter or async loader.
   * - `'tag'` — free-text + chips.
   *
   */
  readonly mode = input<WrSelectMode | null>(null);

  /** Resolved mode — `'single'` unless `[mode]` says otherwise. */
  protected readonly effectiveMode = computed<WrSelectMode>(() => this.mode() ?? 'single');

  /** Convenience — `effectiveMode() === 'multi'`. */
  protected readonly isMulti = computed(() => this.effectiveMode() === 'multi');

  /** Convenience — `effectiveMode() === 'tag'`. */
  protected readonly isTag = computed(() => this.effectiveMode() === 'tag');

  /** Convenience — `effectiveMode() === 'search'`. Exposed via context for options. */
  readonly isSearch = computed(() => this.effectiveMode() === 'search');

  /**
   * Add a type-ahead filter without changing the value shape — the missing
   * multi-with-search combination, since `[mode]` picks exactly one shape:
   *
   * ```html
   * <wr-select mode="multi" searchable [(value)]="categories">…</wr-select>
   * ```
   *
   * On `multi` the trigger keeps its chips and grows an inline text field (the
   * shape `tag` mode already uses); on `single` it is equivalent to
   * `mode="search"`. Every search input (`[options]`, `[loader]`,
   * `[debounceMs]`, `[minChars]`, `[virtualScroll]`, the `(searchChange)` output, …)
   * applies either way. Ignored in `tag` mode, which owns its own input.
   * @default false
   */
  readonly searchable = input(false, { transform: coerceBooleanProperty });

  /**
   * Filtering is active — either `mode="search"` or `[searchable]`. Exposed via
   * context so each `<wr-option>` can self-hide non-matching rows.
   */
  readonly isSearchable = computed(() => this.isSearch() || (this.searchable() && !this.isTag()));

  /** The trigger *is* the search input: `mode="search"`, or a searchable single. */
  protected readonly isSearchTrigger = computed(() => this.isSearch() || (this.searchable() && !this.hasChips()));

  /** Chips plus an inline search field — a searchable multi-select. */
  protected readonly hasChipSearch = computed(() => this.searchable() && this.isMulti());

  /** WrSelectContext — resolved multi-selection flag for child options. */
  readonly multi = computed(() => this.effectiveMode() === 'multi' || this.effectiveMode() === 'tag');

  /** Both multi and tag render chips on the trigger. */
  protected readonly hasChips = computed(() => {
    const m = this.effectiveMode();
    return m === 'multi' || m === 'tag';
  });

  /**
   * The live search query. Empty string = no filter. Exposed via context so
   * each `<wr-option>` can self-hide non-matching rows.
   *
   * Two-way bindable, so the query can be owned or reset from outside:
   * `[(searchQuery)]="query"`. For server-side search prefer the debounced
   * {@link searchChange} output — `searchQueryChange` fires on every keystroke.
   */
  readonly searchQuery = model('');

  // Search-mode-only inputs (ignored in other modes)

  /**
   * Search mode: dynamic option array. Each item is rendered as a
   * `<wr-option>` whose label comes from `[displayWith]`. Works
   * alongside projected `<wr-option>` children — both lists are
   * filtered by the search query.
   */
  readonly options = input<readonly unknown[]>([]);

  /** Search mode: map a dynamic option item to its display label. @default String */
  readonly displayWith = input<(item: unknown) => string>((item: unknown) => String(item));

  /**
   * Search mode: async loader. When set, the loader is called on every
   * (debounced) keystroke and its result replaces `[options]`. Supports
   * Observables, Promises, and plain arrays.
   */
  readonly loader = input<WrSelectSearchLoader<unknown> | null>(null);

  /**
   * The option list is already scoped to the query upstream — skip the built-in
   * client-side label filter. Set it when `[options]` is fed from a server via
   * the {@link searchChange} output; the async `[loader]` path implies it.
   *
   * Without this, a server that ranks or fuzzy-matches (returning rows whose
   * labels don't literally contain the query) would have those rows hidden
   * again on the client. @default false
   */
  readonly serverSearch = input(false, { transform: coerceBooleanProperty });

  /**
   * Whether the built-in label filter runs. Exposed via context so each
   * `<wr-option>` knows whether to self-hide. @internal
   */
  readonly clientFilter = computed(() => !this.loader() && !this.serverSearch());

  /** Search mode: debounce (ms) applied to the loader. @default 250 */
  readonly debounceMs = input(250, { transform: (v: unknown): number => Math.max(0, Number(v) || 0) });

  /** Search mode: minimum query length before the panel opens / loader fires. @default 0 */
  readonly minChars = input(0, { transform: (v: unknown): number => Math.max(0, Number(v) || 0) });

  /**
   * Search mode: allow values not in the options list. Enter on an
   * unmatched query commits the raw text as the form value. @default false
   */
  readonly freeText = input(false, { transform: coerceBooleanProperty });

  /**
   * Search mode: window the option panel so thousands of `[options]` keep only
   * ~one viewport of rows in the DOM. Opt-in and OFF by default. Engages ONLY on
   * the pure data-array search tier — it silently falls back to the full render
   * when static `<wr-option>` children are projected or the filtered list is
   * empty. While on, rows are plain `role="option"` elements (no `<wr-option>`),
   * navigated via `aria-activedescendant`, selected by value. @default false
   */
  readonly virtualScroll = input(false, { transform: coerceBooleanProperty });

  /**
   * Search mode: uniform option-row height in px for the virtual window. `0`
   * (default) measures the first rendered row once and reuses it, so it adapts
   * to the control size. Read only when `virtualScroll` engages. @default 0
   */
  readonly rowHeight = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Search mode: height of the virtual scroll viewport — a number (px) or any
   * CSS length. @default 256
   */
  readonly viewportHeight = input<number | string>(256);

  /** Search mode: extra rows kept above/below the virtual viewport. @default 6 */
  readonly overscan = input(6, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 6)) });

  /** Search mode: text shown when the filter / loader returns nothing. Falls back to `select.noResults`. */
  readonly noResultsText = input<string | null>(null);

  /** Search mode: text shown while the async loader is in flight. Falls back to `select.loading`. */
  readonly loadingText = input<string | null>(null);

  protected readonly resolvedNoResults = useI18nText(this.noResultsText, 'select.noResults', 'No results');
  protected readonly resolvedLoading = useI18nText(this.loadingText, 'select.loading', 'Loading…');

  /**
   * Debounced search query, gated to searchable selects. Emits on every settled
   * change — including the empty string when the field is cleared — so a
   * store-backed option list can stay in sync and reset itself. `[debounceMs]`
   * controls the delay; `[minChars]` does NOT gate it, for the same reason the
   * `[loader]` path clears its results below that threshold.
   *
   * This is the hook for server-side search: dispatch on `(searchChange)`, feed
   * the results back through `[options]` (plus `[serverSearch]`), and drive the
   * panel's progress row with `[loading]`. Prefer it over the model's raw
   * `(searchQueryChange)`, which fires on every keystroke.
   *
   * @example
   * ```html
   * <wr-select
   *   mode="search"
   *   serverSearch
   *   [options]="results()"
   *   [loading]="pending()"
   *   (searchChange)="store.search($event)"
   * />
   * ```
   */
  readonly searchChange = output<string>();

  /**
   * Show the panel's progress row. Independent of `[loader]`, which raises and
   * lowers its own flag — use this when the options come from a store fed by
   * the {@link searchChange} output. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /** Search mode: results returned by the async loader. @internal */
  protected readonly loadedOptions = signal<readonly unknown[]>([]);

  /** True while the async `[loader]` is in flight. @internal */
  private readonly loaderLoading = signal(false);

  /** Either flag shows the panel's progress row. @internal */
  protected readonly isLoading = computed(() => this.loading() || this.loaderLoading());

  // Tag-mode-only inputs (ignored in other modes)

  /**
   * Tag mode: keys / characters that commit the current draft into a chip.
   * `'Enter'` is the key name; everything else is a literal character watched
   * in keypresses and pastes. @default ['Enter', ',']
   */
  readonly separators = input<readonly string[]>(['Enter', ',']);

  /** Tag mode: allow the same value to appear more than once. @default false */
  readonly allowDuplicates = input(false, { transform: coerceBooleanProperty });

  /**
   * Tag mode: custom validator — return `true` to accept the value, `false`
   * to silently reject. Receives the trimmed draft + the existing chips.
   */
  readonly validate = input<WrSelectTagValidator | null>(null);

  /** Tag-mode draft (text currently typed in the inline input). @internal */
  protected readonly draft = signal('');

  /**
   * Show a clear-all (×) button at the end of the chip row when at
   * least one option is selected (multi mode only). @default true
   */
  readonly clearable = input(true, { transform: coerceBooleanProperty });

  /**
   * Cap on selected items (multi mode). `0` = unlimited. Once reached,
   * additional clicks on unselected options are ignored. @default 0
   */
  readonly maxItems = input(0, {
    transform: (v: unknown): number => Math.max(0, Number(v) || 0),
  });

  /**
   * Maximum number of chips rendered before collapsing the rest into a
   * `+N more` indicator. `0` = render every chip. @default 0
   */
  readonly maxTagCount = input(0, {
    transform: (v: unknown): number => Math.max(0, Number(v) || 0),
  });

  /**
   * Unified value. Single mode holds a scalar (or `null`); multi / tag
   * mode holds `readonly unknown[]`. Bound by `[formField]`, or two-way
   * via `[(value)]`.
   */
  readonly value = model<unknown>(null);

  /** Emitted on blur / commit so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Listbox id used by the trigger's `aria-controls`. */
  protected readonly listboxId = `wr-select-listbox-${++listboxUid}`;

  /** Registered options (insertion order). Internal — distinct from the public `[options]` input. */
  private readonly registry = signal<readonly WrSelectOptionRegistration[]>([]);

  /**
   * The registry in DOM order — the list the keyboard cursor walks.
   *
   * `registry` is CREATION order, and projected `<wr-option>` children are created
   * before the panel renders its own `[options]` rows, so with both in play the
   * cursor moved in an order the eye could not follow: opening highlighted the
   * third row on screen and ArrowDown went to the last. Value lookups keep reading
   * `registry` — they do not care about order — and a registration with no element
   * keeps its place, since the sort is stable.
   */
  protected readonly orderedRegistry = computed<readonly WrSelectOptionRegistration[]>(() => {
    const list = this.registry();
    if (list.length < 2) return list;
    return [...list].sort((a, b) => {
      if (!a.host || !b.host || a.host === b.host) return 0;
      const relation = a.host.compareDocumentPosition(b.host);
      // `compareDocumentPosition` returns a BITMASK — a node can be both
      // following and contained — so masking is the API's own idiom, not a
      // cleverness to be rewritten as a comparison.
      /* eslint-disable no-bitwise -- reading the flags of a DOM bitmask */
      if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      /* eslint-enable no-bitwise */
      return 0;
    });
  });

  /** Keyboard cursor index into `options`. -1 = none. */
  protected readonly activeIndex = signal(-1);

  /** Id of the active option (for `aria-activedescendant`). */
  readonly activeOptionId = computed<string | null>(() => {
    const idx = this.activeIndex();
    if (this.virtualActive()) {
      // Virtual rows aren't registered; the active id is derived from the index,
      // and returned only while the row is inside the rendered window so
      // `aria-activedescendant` never dangles at a recycled element.
      const { start, end } = this.virtualWindow();
      return idx >= start && idx < end ? this.virtualRowId(idx) : null;
    }
    const list = this.orderedRegistry();
    return idx >= 0 && idx < list.length ? list[idx].id : null;
  });

  protected readonly open = signal(false);
  protected readonly selectedLabel = signal<string | null>(null);

  /**
   * Selected chips (multi + tag modes). Multi reads labels from the
   * registered `<wr-option>` children; tag uses each raw string as
   * both value and label.
   */
  protected readonly selectedChips = computed<readonly SelectedChip[]>(() => {
    if (!this.hasChips()) return [];
    const arr = this.asArray(this.value());
    if (this.isTag()) {
      return arr.map<SelectedChip>(v => ({ value: v, label: String(v) }));
    }
    const list = this.registry();
    return arr.map<SelectedChip>(v => {
      const found = list.find(o => o.value === v);
      // Fall back to `displayWith` (defaults to `String`) rather than `String`
      // directly: a searchable multi fed from `[options]` has no registered
      // `<wr-option>` for a virtualized or unmounted row, and object items
      // would otherwise render as "[object Object]".
      return { value: v, label: found?.getLabel() ?? this.displayWith()(v) };
    });
  });

  protected readonly visibleChips = computed<readonly SelectedChip[]>(() => {
    const cap = this.maxTagCount();
    const chips = this.selectedChips();
    return cap > 0 && chips.length > cap ? chips.slice(0, cap) : chips;
  });

  protected readonly hiddenChipCount = computed(() => {
    const cap = this.maxTagCount();
    const total = this.selectedChips().length;
    return cap > 0 && total > cap ? total - cap : 0;
  });

  protected readonly hasSelection = computed(() => {
    if (this.hasChips()) return this.selectedChips().length > 0;
    return this.value() != null;
  });

  /** Effective disabled state. Part of {@link WrSelectContext} for child options. */
  readonly isDisabled = computed(() => this.disabled());

  protected readonly classes = computed(() => {
    const parts = ['wr-select'];
    if (this.open()) parts.push('wr-select--open');
    if (this.resolvedRounded()) parts.push('wr-select--rounded');
    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-select--${size}`);
    if (this.isMulti()) parts.push('wr-select--multi');
    if (this.isTag()) parts.push('wr-select--tag');
    if (this.isSearchTrigger()) parts.push('wr-select--search');
    if (this.hasChipSearch()) parts.push('wr-select--searchable');
    if (this.isDisabled()) parts.push('wr-select--disabled');
    return parts.join(' ');
  });

  /**
   * Search-mode dynamic options. Loader results win when the loader is
   * set; otherwise the static `[options]` array. Each item is rendered
   * as an internal `<wr-option>` in the panel.
   */
  protected readonly dynamicOptions = computed<readonly unknown[]>(() =>
    this.loader() ? this.loadedOptions() : this.options()
  );

  // --- Virtual scroll (search mode, data-array path) ------------------------

  private static readonly FALLBACK_ROW_PX = 34;
  private static readonly FALLBACK_VIEWPORT_PX = 256;

  /** Consumer-projected `<wr-option>` children only (NOT the `@for`-rendered ones). */
  private readonly projectedOptions = contentChildren(WrOption);

  /**
   * `dynamicOptions()` narrowed to the current search query. `dynamicOptions()`
   * is intentionally UNFILTERED (projected `<wr-option>` self-hide via CSS), so
   * the virtual path — which renders plain rows that can't self-hide — filters
   * here. Loader / `serverSearch` results are already query-scoped upstream.
   */
  protected readonly filteredDynamicOptions = computed<readonly unknown[]>(() => {
    const items = this.dynamicOptions();
    if (!this.clientFilter()) return items;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return items;
    const label = this.displayWith();
    return items.filter(it => label(it).toLowerCase().includes(q));
  });

  /**
   * Virtualization engaged: opt-in, search mode, a non-empty filtered array, and
   * NO projected `<wr-option>` children (those keep the full-render registry path
   * so their DOM-derived labels / selection still work).
   *
   * NOT gated on there being matches. It used to also require
   * `filteredDynamicOptions().length > 0`, which meant a query matching nothing
   * fell back to the full-render path and mounted the ENTIRE unfiltered array —
   * 2000 `<wr-option>` hosts, every one of them `--hidden`, behind a "No
   * results" line — and then tore all of them down again on the next keystroke
   * that matched. The empty window is handled where it belongs: `virtualWindow`
   * already short-circuits on `total === 0`, and `firstEnabled` / `lastEnabled`
   * already answer -1.
   */
  protected readonly virtualActive = computed<boolean>(
    () => this.virtualScroll() && this.isSearchable() && this.projectedOptions().length === 0
  );

  private readonly scrollTop = signal(0);
  private readonly viewportPx = signal(0);
  private readonly measuredRowPx = signal(0);

  /** Effective uniform row height (px). */
  protected readonly effRowH = computed(() =>
    this.rowHeight() > 0 ? this.rowHeight() : this.measuredRowPx() || WrSelect.FALLBACK_ROW_PX
  );

  private readonly fallbackViewportPx = computed(() => {
    const h = this.viewportHeight();
    if (typeof h === 'number') return h;
    return /^\d+$/.test(h) ? Number(h) : WrSelect.FALLBACK_VIEWPORT_PX;
  });

  /** `viewportHeight` as a CSS length for the inline max-height (bare number → px). */
  protected readonly resolvedViewportHeight = computed(() => {
    const h = this.viewportHeight();
    return typeof h === 'number' || /^\d+$/.test(h) ? `${h}px` : h;
  });

  /** Rendered window [start,end) + spacer pads (px). */
  protected readonly virtualWindow = computed<{ start: number; end: number; padTop: number; padBottom: number }>(() => {
    const total = this.filteredDynamicOptions().length;
    if (!this.virtualActive() || total === 0) return { start: 0, end: total, padTop: 0, padBottom: 0 };
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const over = this.overscan();
    const first = Math.min(Math.floor(this.scrollTop() / h), total - 1);
    const count = Math.ceil(vp / h) + 1;
    const start = Math.max(0, first - over);
    const end = Math.min(total, first + count + over);
    return { start, end, padTop: start * h, padBottom: (total - end) * h };
  });

  /** The windowed slice of options, each carrying its absolute index. */
  protected readonly windowOptions = computed<readonly { item: unknown; index: number }[]>(() => {
    const { start, end } = this.virtualWindow();
    return this.filteredDynamicOptions()
      .slice(start, end)
      .map((item, k) => ({ item, index: start + k }));
  });

  /** Stable id for a virtual option row at filtered index `i`. */
  protected virtualRowId(i: number): string {
    return `${this.listboxId}-vopt-${i}`;
  }

  /** The virtual scroll container inside the overlay panel, if attached. */
  private get vlistElement(): HTMLElement | null {
    return this.overlayRef?.overlayElement.querySelector<HTMLElement>('.wr-select-panel__vlist') ?? null;
  }

  /** Scroll filtered index `i` just into view (sets the `scrollTop` signal synchronously). */
  private ensureVisible(i: number): void {
    if (!this.virtualActive() || i < 0) return;
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const top = i * h;
    const cur = this.scrollTop();
    let next = cur;
    if (top < cur) next = top;
    else if (top + h > cur + vp) next = top + h - vp;
    if (next !== cur) {
      this.scrollTop.set(next);
      this.vlistElement?.scrollTo({ top: next });
    }
  }

  /**
   * Count of registered options that pass the current search filter.
   * Hides the noResults state when the panel has at least one visible row.
   */
  protected readonly visibleCount = computed(() => {
    if (this.virtualActive()) return this.filteredDynamicOptions().length;
    const list = this.registry();
    if (!this.isSearchable() || !this.clientFilter()) return list.length;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list.length;
    let count = 0;
    for (const o of list) {
      if (o.getLabel().toLowerCase().includes(q)) count++;
    }
    return count;
  });

  /**
   * Whether the panel may be open at all. `minChars` is documented as the
   * "minimum query length before the panel OPENS", and nothing gated the open —
   * so a picker with `[minChars]="3"` popped a panel on focus and showed an empty
   * bordered box for the first two keystrokes (with the "no results" row itself
   * gated on the same threshold, there was nothing in it to explain the box).
   */
  protected readonly meetsMinChars = computed(
    () => !this.isSearchable() || this.searchQuery().trim().length >= this.minChars()
  );

  /** Search mode: show "no results" when the panel has nothing to offer. */
  protected readonly hasNoResults = computed(() => {
    if (!this.isSearchable() || !this.open() || this.isLoading()) return false;
    if (this.searchQuery().trim().length < this.minChars()) return false;
    return this.visibleCount() === 0;
  });

  /** Search mode: is this option hidden by the current query? @internal */
  private isOptionHidden(label: string): boolean {
    if (!this.isSearchable() || !this.clientFilter()) return false;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return false;
    return !label.toLowerCase().includes(q);
  }

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  /** The inline input inside a chip trigger — tag mode or a searchable multi. @internal */
  protected readonly tagInputEl = viewChild<ElementRef<HTMLInputElement>>('tagInput');

  /** Search-mode inline input. Present only when `mode="search"`. @internal */
  protected readonly searchInputEl = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected focusTagInput(): void {
    this.tagInputEl()?.nativeElement.focus();
  }

  protected focusSearchInput(): void {
    this.searchInputEl()?.nativeElement.focus();
  }

  // Chip-trigger input dispatch. One inline input, two owners: tag mode
  // commits a draft into chips, a searchable multi filters the panel.

  protected onChipsInput(event: Event): void {
    if (this.hasChipSearch()) this.onSearchInput(event);
    else this.onTagInput(event);
  }

  protected onChipsKeydown(event: KeyboardEvent): void {
    if (this.hasChipSearch()) this.onSearchKey(event);
    else this.onTagKeydown(event);
  }

  protected onChipsFocus(): void {
    // Tag mode has no panel to open.
    if (this.hasChipSearch()) this.onSearchFocus();
  }

  protected onChipsPaste(event: ClipboardEvent): void {
    // Splitting a paste into chips is tag-mode behaviour; a search query is
    // pasted as-is.
    if (!this.hasChipSearch()) this.onTagPaste(event);
  }

  protected onChipsBlur(): void {
    if (this.hasChipSearch()) this.touch.emit();
    else this.onTagBlur();
  }

  // Search-mode handlers

  protected onSearchInput(event: Event): void {
    if (this.isDisabled()) return;
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    if (this.meetsMinChars()) {
      if (!this.open()) this.open.set(true);
    } else if (this.open()) {
      this.open.set(false);
    }
    // A new filter invalidates every index, so re-seed the cursor onto the first
    // option that still matches. This must happen on BOTH paths: on the
    // projected-`<wr-option>` path the registry keeps filtered-out options (they
    // only self-hide via CSS), so a stale `activeIndex` would leave the cursor on
    // a row the user can no longer see — and Enter would select it.
    this.activeIndex.set(this.firstEnabled());
    if (this.virtualActive()) {
      this.scrollTop.set(0);
      this.vlistElement?.scrollTo({ top: 0 });
    }
  }

  protected onSearchFocus(): void {
    if (this.isDisabled()) return;
    this.searchHasFocus.set(true);
    if (!this.meetsMinChars()) return;
    if (!this.open()) {
      this.seedActiveIndex();
      this.open.set(true);
    }
  }

  protected onSearchBlur(): void {
    this.searchHasFocus.set(false);
    // Leaving the field is what makes a below-threshold query stale, so this is
    // where the panel-close reset would have run if it could have waited.
    if (!this.open() && this.isSearchable()) this.searchQuery.set('');
    this.touch.emit();
  }

  protected onSearchKey(event: KeyboardEvent): void {
    // freeText: Enter on an unmatched query commits the typed string
    // as the value. Skips when an active option is highlighted (the
    // normal Enter-selects behaviour wins).
    if (event.key === 'Enter' && this.freeText() && this.open()) {
      const q = this.searchQuery().trim();
      const idx = this.activeIndex();
      const list = this.orderedRegistry();
      const hasActive = this.virtualActive()
        ? idx >= 0 && idx < this.filteredDynamicOptions().length
        : idx >= 0 && idx < list.length && !list[idx].disabled && !this.isOptionHidden(list[idx].getLabel());
      if (!hasActive && q) {
        event.preventDefault();
        this.value.set(q);
        this.touch.emit();
        this.open.set(false);
        return;
      }
    }
    // Space belongs to the text field, not to the listbox. The button trigger
    // uses it to pick the active option, but here swallowing it would make a
    // multi-word query ("dump trucks") impossible to type.
    if (event.key === ' ') return;

    // Backspace on an empty query drops the last chip, matching tag mode. The
    // button-trigger path only does this while closed, and a chip-search input
    // keeps the panel open, so it never reaches that branch.
    if (event.key === 'Backspace' && this.hasChipSearch() && this.searchQuery() === '' && this.hasSelection()) {
      const chips = this.selectedChips();
      const last = chips[chips.length - 1];
      if (last) {
        event.preventDefault();
        this.removeChip(last.value, event);
        return;
      }
    }

    // Otherwise route through the same keyboard plumbing as the button trigger.
    this.onTriggerKey(event);
  }

  /**
   * Display text for the search input. Shows the selected option's
   * label when collapsed, or the live query while typing / panel open.
   * @internal
   */
  protected readonly searchDisplay = computed(() => {
    // FOCUS as well as open, and that second term is the whole `[minChars]`
    // story. Backspacing under the threshold closes the panel, and falling back
    // to the selected label the moment `open()` goes false rewrote the field
    // out from under someone who was still typing — "sma" -> "sm" showed an
    // empty box.
    //
    // A NON-EMPTY query, though: picking an option clears it and leaves focus
    // in the field, and there the label is what belongs on screen.
    if (this.open()) return this.searchQuery();
    if (this.searchHasFocus() && this.searchQuery() !== '') return this.searchQuery();
    return this.selectedLabel() ?? '';
  });

  /**
   * Whether the search field holds focus.
   *
   * Read by `searchDisplay`, so it has to be a signal — and it is also what
   * lets the panel-close effect tell "the user walked away" (reset the query)
   * from "the query dropped under `minChars` and they are still typing" (keep
   * it).
   */
  private readonly searchHasFocus = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly responsiveConfig = inject(WR_RESPONSIVE_OVERLAYS);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    // A component destroyed while the panel is open takes its overlay with it.
    // Without this the pane stays in the CDK container forever, and in sheet
    // mode the block scroll strategy is never released, so the page can no
    // longer scroll at all.
    this.destroyRef.onDestroy(() => this.closeOverlay());

    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
        // Reset the search query when the panel closes so a re-open doesn't
        // carry a stale filter — but NOT while the field still has focus.
        //
        // With `[minChars]`, backspacing under the threshold closes the panel
        // (`onSearchInput`), and `searchDisplay` falls back to the selected
        // label the moment `open()` is false — so an unconditional reset here
        // erased what the user was still typing, mid-word. A query the user is
        // actively editing is not stale.
        if (this.isSearchable() && !this.searchHasFocus()) this.searchQuery.set('');
      }
    });

    // One debounced query stream feeds both the async loader and the public
    // `searchChange` output, so they fire on exactly the same cadence.
    // `debounce(() => timer(...))` rather than `debounceTime(this.debounceMs())`:
    // this runs in the constructor, where inputs aren't bound yet, so reading
    // the input eagerly would pin the delay to the default and ignore
    // `[debounceMs]` forever.
    // `skip(1)` sits BEFORE the debounce so it drops the mount-time replay of the
    // empty query and nothing else. Downstream of `debounce` it would instead
    // drop the first *settled* emission — and when a fast typist's first
    // keystrokes coalesce with that initial `''`, the dropped emission is their
    // query, not the replay.
    const debouncedQuery = toObservable(this.searchQuery).pipe(
      skip(1),
      debounce(() => timer(this.debounceMs()))
    );

    debouncedQuery.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(query => {
      if (this.isSearchable()) this.searchChange.emit(query);
    });

    // Async loader pipeline (searchable selects only). `switchMap` cancels
    // in-flight requests when a new keystroke arrives.
    debouncedQuery
      .pipe(
        switchMap(query => {
          const loader = this.loader();
          if (!loader || !this.isSearchable() || query.length < this.minChars()) {
            this.loaderLoading.set(false);
            return of<readonly unknown[]>([]);
          }
          this.loaderLoading.set(true);
          const result = loader(query);
          const source: Observable<readonly unknown[]> = isObservable(result) ? result : from(Promise.resolve(result));
          // A loader can hand back a long-lived observable (a store selector,
          // say) that emits and never completes — so the first value lowers the
          // flag. `finalize` still covers completion, errors and cancellation,
          // including a loader that completes without emitting.
          return source.pipe(
            tap(() => this.loaderLoading.set(false)),
            finalize(() => this.loaderLoading.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(items => this.loadedOptions.set(items));

    // Resolve the single-mode trigger label whenever the value or
    // options change. Multi mode reads `selectedChips` instead and
    // doesn't need this.
    effect(() => {
      const v = this.value();
      const list = this.registry();
      if (this.isMulti()) {
        this.selectedLabel.set(null);
        return;
      }
      const match = list.find(o => o.value === v);
      if (match) {
        this.selectedLabel.set(match.getLabel());
        return;
      }
      // Search mode: a value picked from a virtualized (or since-unmounted) row
      // has no registered `<wr-option>`, so derive its label from `displayWith`
      // — the same function that rendered the row.
      this.selectedLabel.set(v != null && this.isSearchable() ? this.displayWith()(v) : null);
    });

    // Wire the virtual scroll listener + viewport/row measurement while the panel
    // is open and virtualized. Re-runs when the panel opens/closes or the virtual
    // list mounts/unmounts; the microtask defers the DOM read until the overlay
    // portal is attached. Browser-only — the panel never prerenders (overlay).
    effect(onCleanup => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (!this.open() || !this.virtualActive()) return;
      let raf = 0;
      let ro: ResizeObserver | null = null;
      let el: HTMLElement | null = null;
      const onScroll = (): void => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (el) this.scrollTop.set(el.scrollTop);
        });
      };
      queueMicrotask(() => {
        el = this.vlistElement;
        if (!el) return;
        this.viewportPx.set(el.clientHeight);
        if (this.rowHeight() === 0) {
          const h = el.querySelector<HTMLElement>('.wr-option')?.offsetHeight ?? 0;
          if (h > 0) this.measuredRowPx.set(h);
        }
        // Re-seed the scroll with the now-measured row height + real viewport so
        // a deep pre-selected active row lands correctly on first open (the seed
        // before open used the fallback height). No-op when it's already in view.
        this.ensureVisible(this.activeIndex());
        // Sync the freshly-attached element to the retained signal — seeds the
        // scroll to the active option and avoids a blank panel on reopen.
        if (el.scrollTop !== this.scrollTop()) el.scrollTop = this.scrollTop();
        el.addEventListener('scroll', onScroll, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            if (el) this.viewportPx.set(el.clientHeight);
          });
          ro.observe(el);
        }
      });
      onCleanup(() => {
        if (raf) cancelAnimationFrame(raf);
        if (el) el.removeEventListener('scroll', onScroll);
        ro?.disconnect();
      });
    });
  }

  // WrSelectContext

  isSelected(value: unknown): boolean {
    if (this.isMulti()) return this.asArray(this.value()).includes(value);
    return this.value() === value;
  }

  selectOption(value: unknown): void {
    if (this.isMulti()) {
      const current = this.asArray(this.value());
      const idx = current.indexOf(value);
      let next: readonly unknown[];
      if (idx >= 0) {
        next = [...current.slice(0, idx), ...current.slice(idx + 1)];
      } else {
        const cap = this.maxItems();
        if (cap > 0 && current.length >= cap) return;
        next = [...current, value];
      }
      this.value.set(next);
      this.touch.emit();
      // Keep the panel open in multi mode so the user can keep picking.
      return;
    }
    this.value.set(value);
    this.touch.emit();
    // A committed choice replaces the query, focus or no focus: the field goes
    // back to showing the selected label. The close-effect below deliberately
    // will not do it while the field is focused, which is right for a panel
    // that closed under `minChars` and wrong for one that closed on a pick.
    this.searchQuery.set('');
    this.open.set(false);
  }

  registerOption(reg: WrSelectOptionRegistration): () => void {
    this.registry.update(list => [...list, reg]);
    return () => this.registry.update(list => list.filter(o => o.id !== reg.id));
  }

  // Chip handlers (multi + tag)

  /** Remove one selection (chip × button). Works for multi and tag modes. */
  protected removeChip(value: unknown, event: Event): void {
    event.stopPropagation();
    if (this.isDisabled() || !this.hasChips()) return;
    const next = this.asArray(this.value()).filter(v => v !== value);
    this.value.set(next);
    this.touch.emit();
  }

  /** Clear every selection (× button). Multi/tag → empty array; search → null. */
  protected clearAll(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    if (this.hasChips()) {
      this.value.set([]);
      // `isSearchTrigger()`, not `isSearch()` — a searchable single renders the
      // same × and would otherwise fall through to the no-op below.
    } else if (this.isSearchTrigger()) {
      this.value.set(null);
      this.searchQuery.set('');
    } else {
      return;
    }
    this.touch.emit();
  }

  // Tag-mode draft handlers

  /** Capacity check used by tag mode to refuse the next add. */
  protected readonly atCapacity = computed(() => {
    const cap = this.maxItems();
    return cap > 0 && this.asArray(this.value()).length >= cap;
  });

  protected onTagInput(event: Event): void {
    if (this.isDisabled()) return;
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected onTagKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const seps = this.separators();

    if (seps.includes(event.key)) {
      event.preventDefault();
      this.commitDraft();
      return;
    }

    if (event.key === 'Backspace' && this.draft() === '') {
      const chips = this.selectedChips();
      if (chips.length > 0) {
        event.preventDefault();
        this.removeChip(chips[chips.length - 1].value, event);
      }
    }
  }

  protected onTagPaste(event: ClipboardEvent): void {
    if (this.isDisabled()) return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;

    const seps = this.separators().filter(s => s !== 'Enter');
    if (seps.length === 0) return;

    event.preventDefault();
    const escaped = seps.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
    const splitRegex = new RegExp(`[${escaped}\\n]+`);
    for (const part of text.split(splitRegex)) this.tryAddTag(part);
  }

  protected onTagBlur(): void {
    if (this.draft().trim()) this.commitDraft();
    this.touch.emit();
  }

  private commitDraft(): void {
    const v = this.draft().trim();
    this.draft.set('');
    if (v) this.tryAddTag(v);
  }

  private tryAddTag(raw: string): void {
    if (!this.isTag() || this.atCapacity()) return;
    const value = raw.trim();
    if (!value) return;

    const existing = this.asArray(this.value()).map(String);
    if (!this.allowDuplicates() && existing.includes(value)) return;

    const validator = this.validate();
    if (validator && !validator(value, existing)) return;

    const next = [...existing, value];
    this.value.set(next);
    this.touch.emit();
  }

  // Template handlers

  protected onTriggerClick(): void {
    if (this.isDisabled()) return;
    // Tag mode has no panel — clicks should land on the inline input,
    // not toggle an overlay that's never created.
    if (this.isTag()) return;
    this.open.update(v => !v);
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (this.isDisabled()) return;

    if (!this.open()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.seedActiveIndex();
        this.open.set(true);
        return;
      }
      // Multi mode: Backspace on closed trigger removes last chip. Tag
      // mode has its own input handler — never reaches this branch. A
      // searchable multi does, so only claim Backspace once its query is empty
      // — otherwise it would eat a chip and a character at once.
      if (
        event.key === 'Backspace' &&
        this.isMulti() &&
        this.hasSelection() &&
        (!this.hasChipSearch() || this.searchQuery() === '')
      ) {
        event.preventDefault();
        const chips = this.selectedChips();
        const last = chips[chips.length - 1];
        if (last) this.removeChip(last.value, event);
      }
      return;
    }

    // Open — navigation/selection.
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(this.firstEnabled());
        this.ensureVisible(this.activeIndex());
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(this.lastEnabled());
        this.ensureVisible(this.activeIndex());
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const idx = this.activeIndex();
        if (this.virtualActive()) {
          // Virtual rows aren't in the DOM to click — select the value directly.
          const list = this.filteredDynamicOptions();
          if (idx >= 0 && idx < list.length) this.selectOption(list[idx]);
          break;
        }
        const list = this.orderedRegistry();
        // Filtered-out options stay registered (they only self-hide via CSS), so
        // the hidden check is load-bearing: without it Enter can commit a row
        // that is not on screen.
        if (idx >= 0 && idx < list.length && !list[idx].disabled && !this.isOptionHidden(list[idx].getLabel())) {
          const id = list[idx].id;
          const el = this.overlayRef?.overlayElement.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
          el?.click();
        }
        break;
      }
      default:
        break;
    }
  }

  private seedActiveIndex(): void {
    if (this.virtualActive()) {
      const list = this.filteredDynamicOptions();
      const idx = list.findIndex(it => this.isSelected(it));
      this.activeIndex.set(idx >= 0 ? idx : this.firstEnabled());
      this.ensureVisible(this.activeIndex());
      return;
    }
    const list = this.orderedRegistry();
    let selectedIdx = -1;
    if (this.isMulti()) {
      const arr = this.asArray(this.value());
      if (arr.length > 0) selectedIdx = list.findIndex(o => o.value === arr[0]);
    } else {
      selectedIdx = list.findIndex(o => o.value === this.value());
    }
    this.activeIndex.set(selectedIdx >= 0 ? selectedIdx : this.firstEnabled());
  }

  private moveActive(delta: number): void {
    // Virtual rows are never disabled or hidden (the list is already filtered),
    // so navigation is a plain wrap plus a scroll-into-view.
    if (this.virtualActive()) {
      const len = this.filteredDynamicOptions().length;
      if (len === 0) return;
      const i = (this.activeIndex() + delta + len) % len;
      this.activeIndex.set(i);
      this.ensureVisible(i);
      return;
    }
    const list = this.orderedRegistry();
    if (list.length === 0) return;
    let i = this.activeIndex();
    let attempts = list.length;
    while (attempts-- > 0) {
      i = (i + delta + list.length) % list.length;
      const o = list[i];
      if (!o.disabled && !this.isOptionHidden(o.getLabel())) {
        this.activeIndex.set(i);
        return;
      }
    }
  }

  /**
   * Both scan `orderedRegistry`, and that is not interchangeable with
   * `registry`.
   *
   * They RETURN an index, and every reader of `activeIndex` — `activeOptionId`,
   * `moveActive`, `seedActiveIndex`, the Enter branch of `onTriggerKey` —
   * resolves it against DOM order. Scanning creation order here produced an
   * index into the other list: with projected `<wr-option>` children next to
   * `[options]` rows the two differ, so opening or searching left the cursor on
   * a row the user was not looking at, and Enter committed whatever happened to
   * sit at that position in DOM order — a filter-hidden option, which commits
   * nothing at all.
   */
  private firstEnabled(): number {
    if (this.virtualActive()) return this.filteredDynamicOptions().length > 0 ? 0 : -1;
    return this.orderedRegistry().findIndex(o => !o.disabled && !this.isOptionHidden(o.getLabel()));
  }

  private lastEnabled(): number {
    if (this.virtualActive()) return this.filteredDynamicOptions().length - 1;
    const list = this.orderedRegistry();
    let found = -1;
    list.forEach((o, i) => {
      if (!o.disabled && !this.isOptionHidden(o.getLabel())) found = i;
    });
    return found;
  }

  /** Coerce the multi-mode value into an array (tolerates a scalar or null write). */
  private asArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) return value as readonly unknown[];
    if (value == null) return [];
    return [value];
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

    // On small viewports (when opted in) detach from the trigger and present
    // the panel as a full-width slide-up sheet pinned to the bottom edge.
    const asSheet = wrPresentAsSheet(this.responsive(), this.responsiveConfig);

    const positionStrategy = asSheet
      ? this.overlay.position().global().centerHorizontally().bottom('0')
      : this.overlay
          .position()
          .flexibleConnectedTo(this.host)
          .withPositions([
            { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
            { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
          ])
          .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: asSheet ? this.scrollStrategies.block() : this.scrollStrategies.reposition(),
      // Floor the panel at the trigger width (it can still grow for long
      // options) instead of pinning it. The panel fills this via `width: 100%`,
      // so the flex overlay pane has no transparent gutter beside a
      // content-narrow panel — that gutter would otherwise sit "inside" the
      // overlay and swallow outside-clicks, leaving the panel open. Mirrors how
      // mat-select sizes its overlay.
      width: asSheet ? '100%' : undefined,
      minWidth: asSheet ? undefined : this.host.nativeElement.getBoundingClientRect().width,
      hasBackdrop: asSheet,
      // `wr-overlay-backdrop`, not a name of our own: that class is what carries
      // the dim and the blur (overlay/styles), and this stylesheet already
      // imports it for exactly this. A custom class also REPLACES the CDK
      // default, so the sheet had an invisible scrim that still ate clicks.
      backdropClass: asSheet ? 'wr-overlay-backdrop' : undefined,
      panelClass: asSheet ? ['wr-select-overlay', 'wr-overlay-sheet'] : 'wr-select-overlay',
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    if (asSheet) {
      this.overlayRef
        .backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.open.set(false));
    }

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.open.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.open.set(false);
        }
      });
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
