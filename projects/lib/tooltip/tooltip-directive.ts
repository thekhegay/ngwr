import {
  AfterViewInit,
  ComponentRef,
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  ViewContainerRef,
} from '@angular/core';

import { WrTooltipComponent } from './tooltip-component';
import { WrTooltipTrigger } from './tooltip-trigger';

@Directive({
  selector: '[wrTooltip]',
  exportAs: 'wrTooltip',
})
export class WrTooltipDirective implements AfterViewInit {
  @Input('wrTooltip') message: string | null = null;

  @Input() trigger: WrTooltipTrigger = 'hover';

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.trigger === 'click') {
      event.preventDefault();
      this.onTooltipShow();
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.trigger === 'hover') {
      this.onTooltipShow();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.trigger === 'hover') {
      let overlayElement: HTMLElement | undefined;

      this.leaveDelay(true, false, 0.1);

      if (this.componentRef.instance?.overlay.overlayRef && !overlayElement) {
        overlayElement = this.componentRef.instance.overlay.overlayRef.overlayElement;

        this.r2.listen(overlayElement, 'mouseenter', () => {
          this.leaveDelay(false, true, 0.1);
        });
        this.r2.listen(overlayElement, 'mouseleave', () => {
          this.leaveDelay(false, false, -1);
        });
      }
    }
  }

  private readonly componentRef: ComponentRef<WrTooltipComponent> = this.vcr.createComponent(WrTooltipComponent);
  private delayTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly elRef: ElementRef,
    private readonly r2: Renderer2,
    private readonly vcr: ViewContainerRef
  ) {}

  ngAfterViewInit(): void {
    this.componentRef.instance.origin = this.elRef;
    this.componentRef.instance.message = this.message;
    this.componentRef.instance.trigger = this.trigger;
  }

  private onTooltipShow(): void {
    this.componentRef?.instance?.show();
  }

  private onTooltipHide(): void {
    this.componentRef?.instance?.hide();
  }

  private leaveDelay(isOrigin: boolean, isEnter: boolean, delay: number = -1): void {
    if (delay > 0) {
      this.delayTimer = setTimeout(() => {
        this.delayTimer = undefined;
        isEnter ? this.onTooltipShow() : this.onTooltipHide();
      }, delay * 1000);
    } else {
      isEnter && isOrigin ? this.onTooltipShow() : this.onTooltipHide();
    }
  }
}
