import { Component, HostBinding, Optional, Self, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Component({
  selector: 'wr-password-input',
  templateUrl: './password-input.component.html',
  encapsulation: ViewEncapsulation.None
})
export class WrPasswordInputComponent implements ControlValueAccessor {
  @HostBinding() class = 'wr-password-input';

  public type: 'input' | 'password' = 'password';
  public disabled: boolean = false;
  public value: string | null = null;
  public touched = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl
  ) {
    if (ngControl !== null) {
      ngControl.valueAccessor = this;
    }
  }

  onVisibilityClick($event: any): void {
    $event.stopPropagation();
    this.type === 'password' ? this.type = 'input' : this.type = 'password';
  }

  onInput($event: any): void {
    this.value = $event.currentTarget.value;
    this.touched = true;
    this.onChange(this.value);
  }

  onChange = (value: any) => { };

  onTouched = () => {};

  onFocusOut(): void {
    this.touched = true;
    this.onTouched();
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  writeValue(obj: any): void {
    this.value = obj;
  }
}
