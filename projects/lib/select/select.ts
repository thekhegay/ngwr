/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { type Observable, debounceTime, finalize, from, isObservable, of, switchMap } from 'rxjs';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

import { WrOption } from './option';
import { WR_SELECT, type WrSelectContext, type WrSelectOptionRegistration } from './tokens';
import type { WrSelectMode, WrSelectSearchLoader, WrSelectTagValidator } from './types';

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
 * Implements `ControlValueAccessor` — usable with `[(ngModel)]`,
 * `formControl`, or `formControlName`.
 *
 * @example
 * ```html
 * <!-- Single -->
 * <wr-select placeholder="Pick a size" [(ngModel)]="size">
 *   <wr-option value="sm">Small</wr-option>
 *   <wr-option value="md">Medium</wr-option>
 *   <wr-option value="lg">Large</wr-option>
 * </wr-select>
 *
 * <!-- Multi -->
 * <wr-select mode="multi" placeholder="Pick tags" [(ngModel)]="tags">
 *   <wr-option value="ts">TypeScript</wr-option>
 *   <wr-option value="ng">Angular</wr-option>
 * </wr-select>
 * ```
 *
 * The legacy `[multi]="true"` boolean is still accepted but is now an
 * alias for `[mode]="'multi'"` — prefer the explicit mode.
 *
 * @see https://ngwr.dev/components/select
 */
@Component({
  selector: 'wr-select',
  templateUrl: './select.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrOption],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSelect),
      multi: true,
    },
    {
      provide: WR_SELECT,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSelect),
    },
  ],
})
export class WrSelect implements ControlValueAccessor, WrSelectContext {
  /** Placeholder shown when no option is selected. Falls back to `select.placeholder`. */
  readonly placeholder = input<string | null>(null);

  /** Clear-selection (×) button aria-label. Falls back to `select.clearSelection`. */
  readonly clearLabel = input<string | null>(null);

  protected readonly resolvedPlaceholder = useI18nText(this.placeholder, 'select.placeholder', '');
  protected readonly resolvedClear = useI18nText(this.clearLabel, 'select.clearSelection', 'Clear selection');

  /** Per-chip ARIA label — interpolates `{{label}}`. @internal */
  protected readonly chipRemoveLabel = useI18nFormatter('select.removeItem', 'Remove {{label}}');

  /** Disable the select. Also set by Angular forms via `setDisabledState`. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Pill-shaped corners on the trigger. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Behavior mode. `<wr-select>` is the unified combobox primitive —
   * pick the shape via `[mode]`:
   *
   * - `'single'` (default) — one value, no input. Classic dropdown.
   * - `'multi'` — array value, chips on the trigger.
   * - `'search'` *(planned)* — type-ahead with sync filter or async loader.
   * - `'tag'` *(planned)* — free-text + chips with optional `allowCreate`.
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

  /** WrSelectContext — resolved multi-selection flag for child options. */
  readonly multi = computed(() => this.effectiveMode() === 'multi' || this.effectiveMode() === 'tag');

  /** Both multi and tag render chips on the trigger. */
  protected readonly hasChips = computed(() => {
    const m = this.effectiveMode();
    return m === 'multi' || m === 'tag';
  });

  /**
   * Search-mode query. Empty string = no filter. Exposed via context so
   * each `<wr-option>` can self-hide non-matching rows.
   */
  readonly searchQuery = signal('');

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

  /** Search mode: debounce (ms) applied to the loader. @default 250 */
  readonly debounceMs = input(250, { transform: (v: unknown): number => Math.max(0, Number(v) || 0) });

  /** Search mode: minimum query length before the panel opens / loader fires. @default 0 */
  readonly minChars = input(0, { transform: (v: unknown): number => Math.max(0, Number(v) || 0) });

  /**
   * Search mode: allow values not in the options list. Enter on an
   * unmatched query commits the raw text as the form value. @default false
   */
  readonly freeText = input(false, { transform: coerceBooleanProperty });

  /** Search mode: text shown when the filter / loader returns nothing. Falls back to `select.noResults`. */
  readonly noResultsText = input<string | null>(null);

  /** Search mode: text shown while the async loader is in flight. Falls back to `select.loading`. */
  readonly loadingText = input<string | null>(null);

  protected readonly resolvedNoResults = useI18nText(this.noResultsText, 'select.noResults', 'No results');
  protected readonly resolvedLoading = useI18nText(this.loadingText, 'select.loading', 'Loading…');

  /** Search mode: results returned by the async loader. @internal */
  protected readonly loadedOptions = signal<readonly unknown[]>([]);

  /** Search mode: true while the loader is in flight. @internal */
  protected readonly loading = signal(false);

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
   * Unified value signal. Single mode holds `T | null`; multi mode
   * holds `readonly T[]`. Internal — consumers go through `[(ngModel)]`
   * or `[formControl]` via CVA.
   * @internal
   */
  readonly value = signal<unknown>(null);

  /** Listbox id used by the trigger's `aria-controls`. */
  protected readonly listboxId = `wr-select-listbox-${++listboxUid}`;

  /** Registered options (insertion order). Internal — distinct from the public `[options]` input. */
  private readonly registry = signal<readonly WrSelectOptionRegistration[]>([]);

  /** Keyboard cursor index into `options`. -1 = none. */
  private readonly activeIndex = signal(-1);

  /** Id of the active option (for `aria-activedescendant`). */
  readonly activeOptionId = computed<string | null>(() => {
    const idx = this.activeIndex();
    const list = this.registry();
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
      return { value: v, label: found?.getLabel() ?? String(v) };
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

  private readonly disabledFromCva = signal(false);

  /** Effective disabled state — input wins, CVA second. */
  readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-select'];
    if (this.open()) parts.push('wr-select--open');
    if (this.rounded()) parts.push('wr-select--rounded');
    if (this.isMulti()) parts.push('wr-select--multi');
    if (this.isTag()) parts.push('wr-select--tag');
    if (this.isSearch()) parts.push('wr-select--search');
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

  /**
   * Count of registered options that pass the current search filter.
   * Hides the noResults state when the panel has at least one visible row.
   */
  protected readonly visibleCount = computed(() => {
    const list = this.registry();
    if (!this.isSearch()) return list.length;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list.length;
    let count = 0;
    for (const o of list) {
      if (o.getLabel().toLowerCase().includes(q)) count++;
    }
    return count;
  });

  /** Search mode: show "no results" when the panel has nothing to offer. */
  protected readonly hasNoResults = computed(() => {
    if (!this.isSearch() || !this.open() || this.loading()) return false;
    if (this.searchQuery().trim().length < this.minChars()) return false;
    return this.visibleCount() === 0;
  });

  /** Search mode: is this option hidden by the current query? @internal */
  private isOptionHidden(label: string): boolean {
    if (!this.isSearch()) return false;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return false;
    return !label.toLowerCase().includes(q);
  }

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  /** Tag-mode inline input. Present only when `mode="tag"`. @internal */
  protected readonly tagInputEl = viewChild<ElementRef<HTMLInputElement>>('tagInput');

  /** Search-mode inline input. Present only when `mode="search"`. @internal */
  protected readonly searchInputEl = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected focusTagInput(): void {
    this.tagInputEl()?.nativeElement.focus();
  }

  protected focusSearchInput(): void {
    this.searchInputEl()?.nativeElement.focus();
  }

  // Search-mode handlers

  protected onSearchInput(event: Event): void {
    if (this.isDisabled()) return;
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    if (!this.open()) this.open.set(true);
  }

  protected onSearchFocus(): void {
    if (this.isDisabled()) return;
    if (!this.open()) {
      this.seedActiveIndex();
      this.open.set(true);
    }
  }

  protected onSearchKey(event: KeyboardEvent): void {
    // freeText: Enter on an unmatched query commits the typed string
    // as the value. Skips when an active option is highlighted (the
    // normal Enter-selects behaviour wins).
    if (event.key === 'Enter' && this.freeText() && this.open()) {
      const q = this.searchQuery().trim();
      const idx = this.activeIndex();
      const list = this.registry();
      const hasActive =
        idx >= 0 && idx < list.length && !list[idx].disabled && !this.isOptionHidden(list[idx].getLabel());
      if (!hasActive && q) {
        event.preventDefault();
        this.value.set(q);
        this.onChange(q);
        this.onTouched();
        this.open.set(false);
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
    if (this.open()) return this.searchQuery();
    return this.selectedLabel() ?? '';
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private overlayRef: OverlayRef | null = null;

  private onChange: (value: unknown) => void = noop;
  protected onTouched: () => void = noop;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
        // Reset the search query when the panel closes so a re-open
        // doesn't carry a stale filter.
        if (this.isSearch()) this.searchQuery.set('');
      }
    });

    // Async loader pipeline (search mode only). `switchMap` cancels
    // in-flight requests when a new keystroke arrives.
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(this.debounceMs()),
        switchMap(query => {
          const loader = this.loader();
          if (!loader || !this.isSearch() || query.length < this.minChars()) {
            this.loading.set(false);
            return of<readonly unknown[]>([]);
          }
          this.loading.set(true);
          const result = loader(query);
          const source: Observable<readonly unknown[]> = isObservable(result) ? result : from(Promise.resolve(result));
          return source.pipe(finalize(() => this.loading.set(false)));
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
      this.selectedLabel.set(match ? match.getLabel() : null);
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
      this.onChange(next);
      this.onTouched();
      // Keep the panel open in multi mode so the user can keep picking.
      return;
    }
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
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
    this.onChange(next);
    this.onTouched();
  }

  /** Clear every selection (× button). Multi/tag → empty array; search → null. */
  protected clearAll(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;
    if (this.hasChips()) {
      this.value.set([]);
      this.onChange([]);
    } else if (this.isSearch()) {
      this.value.set(null);
      this.onChange(null);
      this.searchQuery.set('');
    } else {
      return;
    }
    this.onTouched();
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
    this.onTouched();
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
    this.onChange(next);
    this.onTouched();
  }

  // ControlValueAccessor

  writeValue(value: unknown): void {
    if (this.hasChips()) {
      this.value.set(Array.isArray(value) ? (value as readonly unknown[]) : []);
    } else {
      this.value.set(value);
    }
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
    if (isDisabled) this.open.set(false);
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
      // mode has its own input handler — never reaches this branch.
      if (event.key === 'Backspace' && this.isMulti() && this.hasSelection()) {
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
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(this.lastEnabled());
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const idx = this.activeIndex();
        const list = this.registry();
        if (idx >= 0 && idx < list.length && !list[idx].disabled) {
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
    const list = this.registry();
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
    const list = this.registry();
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

  private firstEnabled(): number {
    return this.registry().findIndex(o => !o.disabled && !this.isOptionHidden(o.getLabel()));
  }

  private lastEnabled(): number {
    const list = this.registry();
    let found = -1;
    list.forEach((o, i) => {
      if (!o.disabled && !this.isOptionHidden(o.getLabel())) found = i;
    });
    return found;
  }

  /** Coerce the multi-mode value signal into an array (handles writeValue from non-array). */
  private asArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) return value as readonly unknown[];
    if (value == null) return [];
    return [value];
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      width: this.host.nativeElement.getBoundingClientRect().width,
      panelClass: 'wr-select-overlay',
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef
      .outsidePointerEvents()
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
