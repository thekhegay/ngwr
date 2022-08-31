import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { stylePrefix, BaseComponent, BooleanInput, InputBoolean } from '../_core';

export type WrButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark';
export type WrButtonSize = 'default' | 'small';

@Component({
  selector: 'wr-btn, [wr-btn]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content><wr-spin *ngIf="loading"></wr-spin>`
})
export class WrButtonComponent extends BaseComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() color: WrButtonColor = 'primary';
  @Input() size: WrButtonSize = 'default';

  @Input() @InputBoolean() disabled: BooleanInput = false;
  @Input() @InputBoolean() outlined: BooleanInput = false;
  @Input() @InputBoolean() rounded: BooleanInput = false;
  @Input() @InputBoolean() loading: BooleanInput = false;
  @Input() @InputBoolean() block: BooleanInput = false;

  private readonly baseClass: string = `${stylePrefix}-btn`;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef,
    private readonly ngZone: NgZone,
    private readonly r2: Renderer2
  ) {
    super();
  }

  ngOnInit(): void {
    this.setClasses();

    this.ngZone.runOutsideAngular(() => {
      /**
       * Caretaker note: this event listener could've been added through `host.click` or `HostListener`.
       * The compiler generates the `ɵɵlistener` instruction which wraps the actual listener internally into the
       * function, which runs `markDirty()` before running the actual listener (the decorated class method).
       * Since we're preventing the default behavior and stopping event propagation
       * this doesn't require Angular to run the change detection.
       */
      fromEvent<MouseEvent>(this.elRef.nativeElement, 'click')
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(event => {
          if (this.disabled && (event.target as HTMLElement)?.tagName === 'A') {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        });
    });
  }

  ngAfterViewInit(): void {
    this.insertSpan(this.elRef.nativeElement.childNodes, this.r2);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['disabled']?.currentValue) {
      this.r2.removeClass(this.elRef.nativeElement, `${this.baseClass}--disabled`);
    }
    if (!changes['disabled']?.currentValue) {
      this.r2.removeClass(this.elRef.nativeElement, `${this.baseClass}--loading`);
    }
    this.setClasses();
    this.cdr.detectChanges();
  }

  private insertSpan(nodes: NodeList, renderer: Renderer2): void {
    nodes.forEach(node => {
      if (node.nodeName === '#text') {
        const span = renderer.createElement('span');
        renderer.addClass(span, `${this.baseClass}__text`);
        const parent = renderer.parentNode(node);
        renderer.insertBefore(parent, span, node);
        renderer.appendChild(span, node);
      }
    });
  }

  private setClasses(): void {
    const el = this.elRef.nativeElement;
    const add = (klass: string): void => this.r2.addClass(el, `${this.baseClass}-${klass}`);

    this.r2.addClass(el, this.baseClass);
    add(this.color);

    if (this.rounded) {
      add(`-rounded`);
    }

    if (this.loading) {
      add(`-loading`);
    }

    if (this.block) {
      add(`-block`);
    }

    add(`-${this.size}`);

    if (this.outlined) {
      add(`-outlined`);
    }

    if (this.disabled) {
      add('-disabled');
    }
  }
}
