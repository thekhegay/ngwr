import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone, OnChanges,
  OnDestroy,
  OnInit,
  Renderer2, SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InputBoolean } from '../core/util';

export type WalrusButtonColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type WalrusButtonSize = 'default' | 'small';

@Component({
  selector: 'wr-btn, [wr-btn]',
  exportAs: 'wrButton',
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content><wr-spin *ngIf="loading"></wr-spin>`
})
export class WalrusButtonComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() color: WalrusButtonColor = 'primary';
  @Input() size: WalrusButtonSize = 'default';

  @Input() @InputBoolean() disabled: boolean | string = false;
  @Input() @InputBoolean() outlined: boolean | string = false;
  @Input() @InputBoolean() rounded: boolean | string = false;
  @Input() @InputBoolean() loading: boolean | string = false;
  @Input() @InputBoolean() block: boolean | string = false;

  private readonly baseClass: string = 'wr-btn';
  private destroy$: Subject<void> = new Subject<void>();

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef,
    private readonly ngZone: NgZone,
    private readonly r2: Renderer2,
  ) {}

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
        .pipe(takeUntil(this.destroy$))
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
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
        renderer.addClass(span, 'wr-btn__text');
        const parent = renderer.parentNode(node);
        renderer.insertBefore(parent, span, node);
        renderer.appendChild(span, node);
      }
    });
  }

  private setClasses() {
    const el = this.elRef.nativeElement;
    const add = (klass: string) => this.r2.addClass(el, `${this.baseClass}-${klass}`);

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
