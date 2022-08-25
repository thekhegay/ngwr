import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';

import { stylePrefix, BooleanInput, InputBoolean } from '../_core';

@Component({
  selector: 'wr-form-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})
export class WrFormItemComponent implements OnInit, OnChanges {
  @Input() @InputBoolean() hasError: BooleanInput = false;

  private readonly baseClass: string = `${stylePrefix}-form-item`;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef,
    private readonly r2: Renderer2
  ) {}

  ngOnInit(): void {
    this.setClasses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['hasError']?.currentValue) {
      this.r2.removeClass(this.elRef.nativeElement, `${this.baseClass}--has-error`);
    }
    this.setClasses();
    this.cdr.detectChanges();
  }

  private setClasses(): void {
    const el = this.elRef.nativeElement;
    const add = (klass: string): void => this.r2.addClass(el, `${this.baseClass}-${klass}`);

    this.r2.addClass(el, this.baseClass);

    if (this.hasError) {
      add('-has-error');
    }
  }
}
