import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BaseComponent, BooleanInput, InputBoolean, SafeAny } from '../_core';
import { wrIconName } from '../icon';

export type WrButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark';
export type WrButtonSize = 'default' | 'small';
export type WrButtonIconPosition = 'start' | 'end';

@Component({
  selector: 'wr-btn, button[wr-btn], a[wr-btn]',
  exportAs: 'wrBtn',
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrButtonComponent extends BaseComponent implements OnInit, AfterViewInit {
  @Input() color: WrButtonColor = 'primary';
  @Input() size: WrButtonSize = 'default';
  @Input() icon: wrIconName | null = null;
  @Input() iconPosition: WrButtonIconPosition = 'start';
  @Input() @InputBoolean() disabled: BooleanInput = false;
  @Input() @InputBoolean() outlined: BooleanInput = false;
  @Input() @InputBoolean() rounded: BooleanInput = false;
  @Input() @InputBoolean() loading: BooleanInput = false;
  @Input() @InputBoolean() fullwidth: BooleanInput = false;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-btn': true,
      'wr-btn--primary': this.color === 'primary',
      'wr-btn--secondary': this.color === 'secondary',
      'wr-btn--success': this.color === 'success',
      'wr-btn--warning': this.color === 'warning',
      'wr-btn--danger': this.color === 'danger',
      'wr-btn--light': this.color === 'light',
      'wr-btn--medium': this.color === 'medium',
      'wr-btn--dark': this.color === 'dark',
      'wr-btn--default': this.size === 'default',
      'wr-btn--small': this.size === 'small',
      'wr-btn--icon-start': this.icon && this.iconPosition === 'start',
      'wr-btn--icon-end': this.icon && this.iconPosition === 'end',
      'wr-btn--outlined': this.outlined,
      'wr-btn--rounded': this.rounded,
      'wr-btn--loading': this.loading,
      'wr-btn--full': this.fullwidth
    };
  }

  @HostBinding('disabled') _disabled = this.disabled || null;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef<HTMLButtonElement | HTMLLinkElement | HTMLAnchorElement | HTMLElement>,
    private readonly ngZone: NgZone,
    private readonly r2: Renderer2
  ) {
    super();
  }

  ngOnInit(): void {
    /**
     * Event listener added to prevent default behavior, so we don't need to call change detection
     * By default, compiler wraps HostListener to `ɵɵlistener`, which call `markDirty()` before running actual listener.
     */
    this.ngZone.runOutsideAngular(() => {
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

  /**
   * Sanitizing `<ng-content></ng-content>` from other content except #text
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeName}
   *
   * @param {NodeList} nodes List of nodes from `nativeElement.childNodes`
   * @param {Renderer2} r2 Renderer2 from `@angular/core`
   */
  private insertSpan(nodes: NodeList, r2: Renderer2): void {
    nodes.forEach(node => {
      if (node.nodeName === '#text') {
        const span: HTMLSpanElement = r2.createElement('span');
        r2.addClass(span, `wr-btn__text`);
        const parent: ParentNode = r2.parentNode(node);
        r2.insertBefore(parent, span, node);
        r2.appendChild(span, node);
      }
    });
  }
}
