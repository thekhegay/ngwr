/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  Input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { noop } from 'rxjs';

@Directive({
  selector: 'textarea[wr-textarea]',
  standalone: true,
  host: {
    '[class.wr-textarea]': 'true',
    '[class.wr-textarea--resizable]': 'resizable',
    '[class.wr-textarea--disabled]': 'isDisabled()',
    '[class.wr-textarea--autosize]': 'autosize',
    '[attr.disabled]': 'isDisabled() || null',
    '[attr.readonly]': 'readonly || null'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: WrTextareaDirective,
      multi: true,
    },
  ],
})
export class WrTextareaDirective implements ControlValueAccessor, AfterViewInit {
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) resizable = true;
  @Input({ transform: booleanAttribute }) autosize = false;

  @HostListener("input", ["$event"])
  public onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.onChange(value);

    if (this.autosize) {
      this.resizeTextarea();
    }
  }

  @HostListener("blur")
  public onBlur(): void {
    this.onTouch();
  }

  protected readonly isDisabled = signal(false);
  private readonly element: HTMLTextAreaElement;

  private readonly elementRef: ElementRef<HTMLTextAreaElement> = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.element = this.elementRef.nativeElement;
  }

  ngAfterViewInit(): void {
    if (this.autosize) {
      this.resizeTextarea();
    }
  }

  onChange: (value: string) => void = noop;
  onTouch: () => void = noop;

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(coerceBooleanProperty(isDisabled));
  }

  writeValue(value: string): void {
    this.element.value = value ?? "";

    requestAnimationFrame(() => {
      this.resizeTextarea();
    });

    this.cdr.markForCheck();
  }

  private resizeTextarea(): void {
    if (!this.autosize) {
      return;
    }

    this.element.style.height = "auto";
    this.element.style.height = `${this.element.scrollHeight}px`;
  }
}
