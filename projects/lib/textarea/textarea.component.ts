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
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ElementRef,
  forwardRef,
  HostBinding,
  inject,
  Input,
  signal, ViewChild,
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
  standalone: true,
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

  @ViewChild("textareaNative")
  private textareaNative: ElementRef<HTMLTextAreaElement> | undefined;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-textarea': true,
      'wr-textarea--resizable': this.resizable,
      'wr-textarea--disabled': this.isDisabled(),
      "wr-textarea--autosize": this.autosize
    };
  }

  protected value?: string;

  protected readonly inputValue = signal<string | null>(null);
  protected readonly isDisabled = signal(false);

  private readonly cdr = inject(ChangeDetectorRef);

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
    this.value = value;
    this.onChange(value);
    this.inputValue.set(value);

    requestAnimationFrame(() => {
      this.resizeTextarea();
    });

    this.cdr.markForCheck();
  }

  resizeTextarea(): void {
    if (!this.autosize || !this.textareaNative) {
      return;
    }

    const textarea = this.textareaNative.nativeElement;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}
