import {
  Directive,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  Optional,
  Self,
  SimpleChanges
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { BaseComponent, stylePrefix } from '../_core';

@Directive({
  selector: 'wr-input, input[wr-input], textarea[wr-input]',
})
export class WrInputDirective extends BaseComponent implements OnInit, OnChanges {
  @HostBinding('class') class = `${stylePrefix}-input`;

  @HostBinding(`class.${stylePrefix}-input--disabled`)
  @HostBinding('disabled')
  @Input()
  get disabled(): boolean {
    if (this.ngControl && this.ngControl.disabled !== null) {
      return this.ngControl.disabled;
    }
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = value != null && `${value}` !== 'false';
  }
  _disabled: boolean = false;
  disabled$: Subject<boolean> = new Subject<boolean>();

  constructor(
    @Optional() @Self() public ngControl: NgControl
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.ngControl) {
      this.ngControl.statusChanges
        ?.pipe(
          filter(() => this.ngControl.disabled !== null),
          takeUntil(this.ngUnsubscribe)
        )
        .subscribe(() => this.disabled$.next(this.ngControl.disabled!));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { disabled } = changes;
    if (disabled) {
      this.disabled$.next(this.disabled);
    }
  }
}
