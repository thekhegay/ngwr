import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input, OnChanges,
  OnDestroy,
  OnInit,
  Renderer2, SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { Subject } from 'rxjs';
import { InputBoolean } from '../core/util';

export type WalrusTagColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'dark';

@Component({
  selector: 'wr-tag',
  exportAs: 'wrTag',
  preserveWhitespaces: false,
  template: '<wr-spin *ngIf="loading"></wr-spin><ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WalrusTagComponent implements OnInit, OnDestroy, OnChanges {
  // add color class
  @Input() color: WalrusTagColor = 'default';

  // Is tag transparent
  @Input() @InputBoolean() transparent = false;

  @Input() @InputBoolean() loading = false;

  // Is tag outlined
  @Input() @InputBoolean() outline = false;

  // Is tag outlined
  @Input() @InputBoolean() round = false;

  // Is tag hoverable
  @Input() @InputBoolean() hoverable = false;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly elementRef: ElementRef,
    private readonly r2: Renderer2
  ) {
  }

  ngOnInit(): void {
    this.setClasses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      this.setClasses();
    }
  }

  private setClasses(): void {
    const baseClass = 'wr-tag';
    const el = this.elementRef.nativeElement;
    const add = (klass: string) => this.r2.addClass(el, `${baseClass}-${klass}`);
    const rm = (klass: string) => this.r2.removeClass(el, `${baseClass}-${klass}`);

    el.classList = [];

    this.r2.addClass(el, baseClass);
    add(this.color);

    if (this.round) {
      add(`-round`);
    }

    if (this.transparent) {
      add(`-transparent`);
    }

    if (this.hoverable) {
      add(`-hoverable`);
    }

    if (this.outline) {
      add(`-outline`);
    }
  }
}
