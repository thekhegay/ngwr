import {
  Directive,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Self,
  SimpleChanges
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { baseClass } from '../_core';

@Directive({
  selector: 'wr-input, input[wr-input], textarea[wr-input]',
})
export class WrInputDirective implements OnChanges, OnInit, OnDestroy {
  @HostBinding('class') class = `${baseClass}-input`;

  @HostBinding(`class.${baseClass}-input--disabled`)
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
  private readonly destroy$: Subject<void> = new Subject<void>();

  constructor(@Optional() @Self() public ngControl: NgControl) {}

  ngOnInit(): void {
    if (this.ngControl) {
      this.ngControl.statusChanges
        ?.pipe(
          filter(() => this.ngControl.disabled !== null),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.disabled$.next(this.ngControl.disabled!);
        });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { disabled } = changes;
    if (disabled) {
      this.disabled$.next(this.disabled);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
