/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Overlay, type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { provideWrIcons, WrIconComponent, chevronDown } from 'ngwr/icon';
import { noop } from 'ngwr/utils';

import { WR_SELECT, type WrSelectContext } from './tokens';

/**
 * Native-like select.
 *
 * Renders a button that opens a CDK overlay containing the projected
 * `<wr-option>` (and optionally `<wr-option-group>`) children. The
 * selected option's label is shown in the button.
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
 * ```
 *
 * @see https://ngwr.dev/docs/components/select
 */
@Component({
  selector: 'wr-select',
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIconComponent],
  providers: [
    provideWrIcons([chevronDown]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSelectComponent),
      multi: true,
    },
    {
      provide: WR_SELECT,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSelectComponent),
    },
  ],
})
export class WrSelectComponent implements ControlValueAccessor, WrSelectContext {
  /** Placeholder shown when no option is selected. @default '' */
  readonly placeholder = input<string>('');

  /** Disable the select. Also set by Angular forms via `setDisabledState`. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Pill-shaped corners on the trigger. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  readonly value = signal<unknown>(null);

  protected readonly open = signal(false);
  protected readonly selectedLabel = signal<string | null>(null);

  private readonly disabledFromCva = signal(false);

  /** Effective disabled state — input wins, CVA second. */
  readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-select'];
    if (this.open()) parts.push('wr-select--open');
    if (this.rounded()) parts.push('wr-select--rounded');
    if (this.isDisabled()) parts.push('wr-select--disabled');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required('panelTpl', { read: TemplateRef });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(Overlay);
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
  }

  // ──────── WrSelectContext ────────

  selectOption(value: unknown, label: string): void {
    this.value.set(value);
    this.selectedLabel.set(label);
    this.onChange(value);
    this.onTouched();
    this.open.set(false);
  }

  // ──────── ControlValueAccessor ────────

  writeValue(value: unknown): void {
    this.value.set(value);
    // Label resolution happens lazily — once options render they'll update
    // their `selected` state via the context, and the trigger pulls
    // `selectedLabel` for the display. When `writeValue` is called before
    // options exist, the label may briefly be empty.
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
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.open.set(true);
    }
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
