import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, Input, OnChanges,
  OnDestroy, OnInit, Renderer2, SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { Subject } from 'rxjs';
import { InputBoolean } from '../core/util';

@Component({
  selector: 'wr-form-item',
  exportAs: 'wrFormItem',
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})
export class WalrusFormItemComponent implements OnInit, OnDestroy, OnChanges {
  @Input() @InputBoolean() hasError: boolean = false;

  private readonly destroy$ = new Subject();

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly el: ElementRef,
    private readonly r2: Renderer2,
  ) {}

  public ngOnInit(): void {
    this.setClasses();
  }

  public ngOnDestroy(): void {
    this.destroy$.next(null);
    this.destroy$.complete();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    const baseClass = 'wr-form-item';
    if (!changes['hasError']?.currentValue) {
      this.r2.removeClass(this.el.nativeElement, `${baseClass}--has-error`);
    }
    this.setClasses();
    this.cdr.detectChanges();
  }

  private setClasses(): void {
    const baseClass = 'wr-form-item';
    const el = this.el.nativeElement;
    const add = (klass: string) => this.r2.addClass(el, `${baseClass}-${klass}`);

    this.r2.addClass(el, baseClass);

    if (this.hasError) {
      add('-has-error');
    }
  }
}
