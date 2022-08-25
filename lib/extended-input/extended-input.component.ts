import {
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnInit,
  Optional,
  Renderer2,
  Self,
  ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { SafeAny, stylePrefix } from '../_core';

@Component({
  selector: 'wr-extended-input',
  templateUrl: './extended-input.component.html',
  encapsulation: ViewEncapsulation.None
})
export class WrExtendedInputComponent implements ControlValueAccessor, OnInit {
  @HostBinding('class') class = `${stylePrefix}-extended-input`;
  @Input() suffix?: string;
  @Input() prefix?: string;

  public disabled: boolean = false;
  public value: string | undefined = undefined;
  public touched: boolean = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private readonly elRef: ElementRef,
    private readonly r2: Renderer2
  ) {
    if (ngControl !== null) {
      ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    const el = this.elRef.nativeElement;
    const add = (klass: string): void => this.r2.addClass(el, `${this.class}-${klass}`);

    if (this.suffix) {
      add('-has-suffix');
    }

    if (this.prefix) {
      add('-has-prefix');
    }
  }

  onInput($event: SafeAny): void {
    this.value = $event.currentTarget.value;
    this.touched = true;
    this.onChange(this.value);
  }

  onChange = (value: SafeAny): void => {};

  onTouched = (): void => {};

  onFocusOut(): void {
    this.touched = true;
    this.onTouched();
  }

  registerOnChange(fn: SafeAny): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: SafeAny): void {
    this.onTouched = fn;
  }

  writeValue(obj: SafeAny): void {
    this.value = obj;
  }
}
