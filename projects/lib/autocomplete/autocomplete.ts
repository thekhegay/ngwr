/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
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

import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop, randomId } from 'ngwr/utils';

/** Function signature for async option loaders. */
type WrAutocompleteAsyncLoader<T> = (query: string) => Observable<readonly T[]> | Promise<readonly T[]> | readonly T[];

function defaultFilter<T>(query: string, item: T, displayWith: (item: T) => string): boolean {
  if (!query) return true;
  return displayWith(item).toLowerCase().includes(query.toLowerCase());
}

/**
 * Generic autocomplete combobox — typed input with an overlay-anchored
 * filtered list of options.
 *
 * Implements `ControlValueAccessor` — value type is `T | null` (or
 * `string | null` when `freeText` is enabled and the user types something
 * that isn't in the options list).
 *
 * Options are projected as a plain `readonly T[]`. Use `displayWith` to
 * map items to a display string, and `filterWith` to override the default
 * case-insensitive `includes` match.
 *
 * @example
 * ```html
 * <wr-autocomplete
 *   [options]="countries"
 *   [(ngModel)]="picked"
 *   placeholder="Search countries"
 * />
 *
 * <wr-autocomplete
 *   [options]="users"
 *   [displayWith]="userLabel"
 *   [(ngModel)]="user"
 * />
 * ```
 *
 * @see https://ngwr.dev/docs/components/autocomplete
 */
@Component({
  selector: 'wr-autocomplete',
  templateUrl: './autocomplete.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrInput, WrInputGroup, WrInputSuffix, ScrollingModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrAutocomplete),
      multi: true,
    },
  ],
})
export class WrAutocomplete<T = string> implements ControlValueAccessor {
  /** Options shown in the panel. @default [] */
  readonly options = input<readonly T[]>([]);

  /** Map an item to its display string. @default String */
  readonly displayWith = input<(item: T) => string>((item: T) => String(item));

  /** Custom filter predicate. Falls back to case-insensitive `includes`. @default null */
  readonly filterWith = input<((query: string, item: T) => boolean) | null>(null);

  /**
   * Async loader called on each (debounced) keystroke when set. Wins over
   * `options` + `filterWith` — the panel shows whatever the loader returns
   * verbatim. Supports Observables, Promises, and plain arrays.
   */
  readonly asyncOptions = input<WrAutocompleteAsyncLoader<T> | null>(null);

  /** Debounce (ms) applied to async loader calls. @default 250 */
  readonly debounceMs = input(250, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 250)) });

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /** Minimum query length before the panel opens. @default 0 */
  readonly minChars = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Allow values not present in the options list. @default false */
  readonly freeText = input(false, { transform: coerceBooleanProperty });

  /** Text shown when no options match the query. @default 'No results' */
  readonly noResultsText = input<string>('No results');

  /** Text shown while async results are loading. @default 'Loading…' */
  readonly loadingText = input<string>('Loading…');

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — input not typeable, panel cannot open. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * Virtualize the options panel using CDK's `cdk-virtual-scroll-viewport`.
   * Use for large option lists (hundreds+) — small lists pay no benefit and
   * lose the variable-height layout. @default false
   */
  readonly virtualScroll = input(false, { transform: coerceBooleanProperty });

  /** Item row height (px) used by the virtual scroll viewport. @default 32 */
  readonly itemSize = input(32, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 32)) });

  /** Viewport height (px) when `virtualScroll` is on. @default 256 */
  readonly viewportHeight = input(256, {
    transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 256)),
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });
  protected readonly viewport = viewChild(CdkVirtualScrollViewport);

  /** Currently bound value (last committed selection). */
  protected readonly value = signal<T | string | null>(null);

  /** Text currently in the input — may differ from `value`'s display. */
  protected readonly text = signal<string>('');

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly panelWidth = signal<number>(0);

  /** Last results returned by the async loader. */
  protected readonly asyncResults = signal<readonly T[]>([]);

  /** True while an async loader call is in flight. */
  protected readonly loading = signal(false);

  protected readonly listboxId = `wr-autocomplete-listbox-${randomId()}`;
  protected readonly optionId = (i: number): string => `${this.listboxId}-opt-${i}`;
  protected readonly activeId = computed(() => {
    const i = this.activeIndex();
    return this.open() && i >= 0 ? this.optionId(i) : null;
  });

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly interactive = computed(() => !this.effectiveDisabled() && !this.readonly());

  /** Filtered options based on current `text`. Returns async results when an async loader is set. */
  protected readonly filtered = computed<readonly T[]>(() => {
    const q = this.text();
    if (q.length < this.minChars()) return [];
    if (this.asyncOptions()) return this.asyncResults();
    const items = this.options();
    const display = this.displayWith();
    const custom = this.filterWith();
    if (custom) return items.filter(item => custom(q, item));
    return items.filter(item => defaultFilter(q, item, display));
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-autocomplete'];
    if (this.open()) parts.push('wr-autocomplete--open');
    if (this.effectiveDisabled()) parts.push('wr-autocomplete--disabled');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());

    // Keep the highlighted option visible when virtual scroll is on —
    // ArrowDown past the rendered window won't be visible otherwise.
    effect(() => {
      const i = this.activeIndex();
      const viewport = this.viewport();
      if (viewport && i >= 0) viewport.scrollToIndex(i, 'smooth');
    });

    // Async loader pipeline — only triggers when `asyncOptions` is set and
    // the query satisfies `minChars`. `switchMap` cancels in-flight requests
    // when a new keystroke arrives, so stale responses can't clobber fresh
    // ones.
    toObservable(this.text)
      .pipe(
        debounceTime(this.debounceMs()),
        switchMap(query => {
          const loader = this.asyncOptions();
          if (!loader || query.length < this.minChars()) {
            this.loading.set(false);
            return of<readonly T[]>([]);
          }
          this.loading.set(true);
          const result = loader(query);
          const source: Observable<readonly T[]> = isObservable(result) ? result : from(Promise.resolve(result));
          return source.pipe(finalize(() => this.loading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(items => {
        this.asyncResults.set(items);
        this.activeIndex.set(items.length > 0 ? 0 : -1);
      });
  }

  // ──────── ControlValueAccessor ────────

  private onChange: (value: T | string | null) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: T | string | null): void {
    this.value.set(value);
    this.text.set(this.labelFor(value));
  }

  registerOnChange(fn: (value: T | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
    if (isDisabled) this.closeOverlay();
  }

  // ──────── Template handlers ────────

  protected onFocus(): void {
    if (!this.interactive()) return;
    if (this.text().length >= this.minChars()) this.openOverlay();
  }

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (this.freeText()) {
      // Free-text mode commits the raw string as the value on every keystroke.
      this.value.set(raw);
      this.onChange(raw);
    }
    this.activeIndex.set(this.filtered().length > 0 ? 0 : -1);
    if (this.interactive()) {
      if (raw.length >= this.minChars()) this.openOverlay();
      else this.closeOverlay();
    }
  }

  protected onBlur(): void {
    this.onTouched();
    // Defer close so option `mousedown` lands before blur tears the overlay.
    setTimeout(() => {
      if (!this.freeText()) {
        // Restore last committed selection's label if the user typed garbage.
        const v = this.value();
        if (v !== null) {
          this.text.set(this.labelFor(v));
        } else {
          this.text.set('');
        }
      }
      this.closeOverlay();
    }, 120);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    const list = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) this.openOverlay();
        if (list.length > 0) this.activeIndex.set((this.activeIndex() + 1 + list.length) % list.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) this.openOverlay();
        if (list.length > 0) {
          const next = this.activeIndex() <= 0 ? list.length - 1 : this.activeIndex() - 1;
          this.activeIndex.set(next);
        }
        break;
      case 'Enter': {
        const i = this.activeIndex();
        if (this.open() && i >= 0 && i < list.length) {
          event.preventDefault();
          this.commit(list[i]);
        }
        break;
      }
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.closeOverlay();
        }
        break;
      default:
        break;
    }
  }

  protected toggleOverlay(): void {
    if (!this.interactive()) return;
    if (this.open()) {
      this.closeOverlay();
    } else {
      this.inputEl().nativeElement.focus();
      this.openOverlay();
    }
  }

  protected selectByIndex(i: number, event: Event): void {
    // Use mousedown (not click) so the option commits before the input's blur
    // fires — preventDefault keeps focus in the input.
    event.preventDefault();
    const item = this.filtered()[i];
    if (item !== undefined) this.commit(item);
  }

  // ──────── Internals ────────

  private commit(item: T): void {
    this.value.set(item);
    this.text.set(this.displayWith()(item));
    this.onChange(item);
    this.closeOverlay();
  }

  private labelFor(value: T | string | null): string {
    if (value === null || value === undefined) return '';
    if (this.options().includes(value as T)) return this.displayWith()(value as T);
    // freeText or out-of-list value — show as-is when stringifiable.
    return String(value);
  }

  // ──────── Overlay ────────

  private openOverlay(): void {
    if (this.overlayRef || !this.interactive()) return;

    const rect = this.host.nativeElement.getBoundingClientRect();
    this.panelWidth.set(rect.width);

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: 'wr-autocomplete-overlay',
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);
    this.open.set(true);

    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.closeOverlay();
      });
  }

  private closeOverlay(): void {
    this.open.set(false);
    this.dispose();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
