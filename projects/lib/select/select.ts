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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { useI18nText } from 'ngwr/i18n';
import { provideWrIcons, WrIcon, chevronDown, close } from 'ngwr/icon';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

import { WR_SELECT, type WrSelectContext, type WrSelectOptionRegistration } from './tokens';

let listboxUid = 0;

interface SelectedChip {
  readonly value: unknown;
  readonly label: string;
}

/**
 * Native-like select.
 *
 * Renders a button that opens a CDK overlay containing the projected
 * `<wr-option>` (and optionally `<wr-option-group>`) children. The
 * selected option's label is shown in the button.
 *
 * Set `[multi]="true"` to switch to multi-select: the trigger renders
 * each selection as a chip with a remove (×) button, clicking an option
 * toggles it without closing the panel, Backspace removes the last
 * chip, and the model value becomes `T[]`.
 *
 * Implements `ControlValueAccessor` — usable with `[(ngModel)]`,
 * `formControl`, or `formControlName`.
 *
 * @example
 * ```html
 * <wr-select placeholder="Pick a size" [(ngModel)]="size">
 *   <wr-option value="sm">Small</wr-option>
 *   <wr-option value="md">Medium</wr-option>
 *   <wr-option value="lg">Large</wr-option>
 * </wr-select>
 *
 * <wr-select multi placeholder="Pick tags" [(ngModel)]="tags">
 *   <wr-option value="ts">TypeScript</wr-option>
 *   <wr-option value="ng">Angular</wr-option>
 * </wr-select>
 * ```
 *
 * @see https://ngwr.dev/docs/components/select
 */
@Component({
  selector: 'wr-select',
  templateUrl: './select.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon],
  providers: [
    provideWrIcons([chevronDown, close]),
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

  /** Disable the select. Also set by Angular forms via `setDisabledState`. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Pill-shaped corners on the trigger. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Allow multiple selections. When enabled the model becomes `T[]`,
   * the trigger renders chips for each selection, and clicking an
   * option toggles instead of closing the panel.
   * @default false
   */
  readonly multi = input(false, { transform: coerceBooleanProperty });

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

  /** Registered options (insertion order). */
  private readonly options = signal<readonly WrSelectOptionRegistration[]>([]);

  /** Keyboard cursor index into `options`. -1 = none. */
  private readonly activeIndex = signal(-1);

  /** Id of the active option (for `aria-activedescendant`). */
  readonly activeOptionId = computed<string | null>(() => {
    const idx = this.activeIndex();
    const list = this.options();
    return idx >= 0 && idx < list.length ? list[idx].id : null;
  });

  protected readonly open = signal(false);
  protected readonly selectedLabel = signal<string | null>(null);

  /** Selected chips (multi mode). Derived from the value array + option labels. */
  protected readonly selectedChips = computed<readonly SelectedChip[]>(() => {
    if (!this.multi()) return [];
    const arr = this.asArray(this.value());
    const list = this.options();
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
    if (this.multi()) return this.selectedChips().length > 0;
    return this.value() != null;
  });

  private readonly disabledFromCva = signal(false);

  /** Effective disabled state — input wins, CVA second. */
  readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-select'];
    if (this.open()) parts.push('wr-select--open');
    if (this.rounded()) parts.push('wr-select--rounded');
    if (this.multi()) parts.push('wr-select--multi');
    if (this.isDisabled()) parts.push('wr-select--disabled');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

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
      }
    });

    // Resolve the single-mode trigger label whenever the value or
    // options change. Multi mode reads `selectedChips` instead and
    // doesn't need this.
    effect(() => {
      const v = this.value();
      const list = this.options();
      if (this.multi()) {
        this.selectedLabel.set(null);
        return;
      }
      const match = list.find(o => o.value === v);
      this.selectedLabel.set(match ? match.getLabel() : null);
    });
  }

  // ──────── WrSelectContext ────────

  isSelected(value: unknown): boolean {
    if (this.multi()) return this.asArray(this.value()).includes(value);
    return this.value() === value;
  }

  selectOption(value: unknown): void {
    if (this.multi()) {
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
    this.options.update(list => [...list, reg]);
    return () => this.options.update(list => list.filter(o => o.id !== reg.id));
  }

  // ──────── Multi-mode chip handlers ────────

  /** Remove one selection from a multi-select (chip × button). */
  protected removeChip(value: unknown, event: Event): void {
    event.stopPropagation();
    if (this.isDisabled() || !this.multi()) return;
    const next = this.asArray(this.value()).filter(v => v !== value);
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  /** Clear every selection (multi-mode clear-all button). */
  protected clearAll(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled() || !this.multi()) return;
    this.value.set([]);
    this.onChange([]);
    this.onTouched();
  }

  // ──────── ControlValueAccessor ────────

  writeValue(value: unknown): void {
    if (this.multi()) {
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

  // ──────── Template handlers ────────

  protected onTriggerClick(): void {
    if (this.isDisabled()) return;
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
      // Multi mode: Backspace on closed trigger removes last chip — same
      // behaviour as the chips-input directive.
      if (event.key === 'Backspace' && this.multi() && this.hasSelection()) {
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
        const list = this.options();
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
    const list = this.options();
    let selectedIdx = -1;
    if (this.multi()) {
      const arr = this.asArray(this.value());
      if (arr.length > 0) selectedIdx = list.findIndex(o => o.value === arr[0]);
    } else {
      selectedIdx = list.findIndex(o => o.value === this.value());
    }
    this.activeIndex.set(selectedIdx >= 0 ? selectedIdx : this.firstEnabled());
  }

  private moveActive(delta: number): void {
    const list = this.options();
    if (list.length === 0) return;
    let i = this.activeIndex();
    let attempts = list.length;
    while (attempts-- > 0) {
      i = (i + delta + list.length) % list.length;
      if (!list[i].disabled) {
        this.activeIndex.set(i);
        return;
      }
    }
  }

  private firstEnabled(): number {
    return this.options().findIndex(o => !o.disabled);
  }

  private lastEnabled(): number {
    const list = this.options();
    let found = -1;
    list.forEach((o, i) => {
      if (!o.disabled) found = i;
    });
    return found;
  }

  /** Coerce the multi-mode value signal into an array (handles writeValue from non-array). */
  private asArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) return value as readonly unknown[];
    if (value == null) return [];
    return [value];
  }

  // ──────── Overlay ────────

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
