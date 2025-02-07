/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  inject,
  Input,
  numberAttribute,
  PLATFORM_ID,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/cdk/types';

/**
 * NGWR textarea component.
 *
 * {@tutorial} [How to use wr-textarea]{@link http://ngwr.dev/docs/components/textarea}
 */
@Component({
  selector: 'wr-textarea',
  templateUrl: './textarea.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTextareaComponent),
      multi: true,
    },
  ],
})
export class WrTextareaComponent extends WrAbstractBase implements ControlValueAccessor, AfterViewInit {
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) resizable = true;
  @Input({ transform: booleanAttribute }) autosize = false;
  @Input({ transform: numberAttribute }) rows = 2;
  @Input({ transform: numberAttribute }) maxRows?: number;

  @Input({ transform: booleanAttribute })
  set disabled(value: boolean) {
    this.isDisabled.set(value);
  }
  get disabled(): boolean {
    return this.isDisabled();
  }

  @ViewChild('textareaNative')
  private textareaNative: ElementRef<HTMLTextAreaElement> | undefined;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-textarea': true,
      'wr-textarea--resizable': this.resizable,
      'wr-textarea--disabled': this.isDisabled(),
      'wr-textarea--autosize': this.autosize,
    };
  }

  protected value?: string;

  protected readonly inputValue = signal<string | null>(null);
  protected readonly isDisabled = signal(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (this.autosize && this.isBrowser) {
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
    this.value = value;
    this.onChange(value);
    this.inputValue.set(value);

    if (this.isBrowser) {
      requestAnimationFrame(() => {
        this.resizeTextarea();
      });
    }

    this.cdr.markForCheck();
  }

  resizeTextarea(): void {
    if (!this.autosize || !this.textareaNative || !this.isBrowser) {
      return;
    }

    const textarea = this.textareaNative.nativeElement;

    textarea.style.height = 'auto';

    let newHeight: number;
    let maxHeight = 'none';

    if (this.maxRows) {
      const computedStyle = getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight, 10) || parseInt(computedStyle.fontSize, 10) * 1.2;

      maxHeight = `${lineHeight * this.maxRows}px`;
      newHeight = Math.min(textarea.scrollHeight, lineHeight * this.maxRows);
    } else {
      newHeight = textarea.scrollHeight;
    }

    textarea.style.maxHeight = maxHeight;
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = this.maxRows && textarea.scrollHeight > newHeight ? 'auto' : 'hidden';
  }
}
