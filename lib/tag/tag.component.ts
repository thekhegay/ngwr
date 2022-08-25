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

import { BooleanInput, InputBoolean, stylePrefix } from '../_core';

export type WrTagColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'dark';

@Component({
  selector: 'wr-tag',
  template: '<wr-spin *ngIf="loading"></wr-spin><ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrTagComponent implements OnInit, OnChanges {
  @Input() color: WrTagColor = 'default';

  @Input() @InputBoolean() transparent: BooleanInput = false;
  @Input() @InputBoolean() loading: BooleanInput = false;
  @Input() @InputBoolean() outlined: BooleanInput = false;
  @Input() @InputBoolean() rounded: BooleanInput = false;
  @Input() @InputBoolean() hoverable: BooleanInput = false;

  private readonly baseClass: string = `${stylePrefix}-tag`;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef,
    private readonly r2: Renderer2
  ) {}

  ngOnInit(): void {
    this.setClasses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.setClasses();
    this.cdr.detectChanges();
  }

  private setClasses(): void {
    const el = this.elRef.nativeElement;
    const add = (klass: string): void => this.r2.addClass(el, `${this.baseClass}-${klass}`);

    this.r2.addClass(el, this.baseClass);
    add(this.color);

    if (this.rounded) {
      add(`-rounded`);
    }

    if (this.transparent) {
      add(`-transparent`);
    }

    if (this.hoverable) {
      add(`-hoverable`);
    }

    if (this.outlined) {
      add(`-outlined`);
    }
  }
}
