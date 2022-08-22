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

@Component({
  selector: 'wr-extended-input',
  templateUrl: './extended-input.component.html',
  encapsulation: ViewEncapsulation.None
})
export class WalrusExtendedInputComponent implements ControlValueAccessor, OnInit {
  @HostBinding('class') class = 'wr-extended-input';
  @Input() suffix?: string;
  @Input() prefix?: string;

  public disabled: boolean = false;
  public value: string | undefined = undefined;
  public touched = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private readonly elRef: ElementRef,
    private readonly r2: Renderer2
  ) {
    if (ngControl !== null) {
      ngControl.valueAccessor = this;
    }
  }

  public ngOnInit(): void {
    const el = this.elRef.nativeElement;
    const add = (klass: string) => this.r2.addClass(el, `${this.class}-${klass}`);

    if (this.suffix) {
      add('-has-suffix')
    }

    if (this.prefix) {
      add('-has-prefix')
    }
  }

  onInput($event: any): void {
    this.value = $event.currentTarget.value;
    this.touched = true;
    this.onChange(this.value);
  }

  onChange = (value: any) => {};

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
