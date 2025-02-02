/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Overlay, OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  ViewContainerRef,
  effect,
  signal,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter, fromEvent, merge } from 'rxjs';

import { WrDropdownMenuComponent } from './dropdown-menu.component';
import { WR_DROPDOWN_POSITIONS, WrDropdownTrigger } from './dropdown.types';

@Directive({
  selector: '[wrDropdown]',
  standalone: true,
  host: {
    '[class.wr-dropdown-trigger]': 'true',
  },
})
export class WrDropdownDirective implements OnDestroy {
  dropdownMenu = input<WrDropdownMenuComponent>();
  trigger = input<WrDropdownTrigger>('click');
  position = input<keyof typeof WR_DROPDOWN_POSITIONS>('bottomLeft');

  private readonly isOpen = signal(false);
  private overlayRef?: OverlayRef;
  private clickTimeStamp = 0;

  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly scrollStrategyOptions = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const isOpen = this.isOpen;

    effect(() => {
      if (isOpen()) {
        this.open();
      } else {
        this.close();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.trigger() !== 'click') {
      return;
    }

    event.stopPropagation();

    if (event.timeStamp === this.clickTimeStamp) {
      return;
    }

    this.isOpen.update(value => !value);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.trigger() !== 'hover') {
      return;
    }

    this.isOpen.set(true);
  }

  private open(): void {
    if (this.overlayRef || !this.dropdownMenu()) {
      return;
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions(WR_DROPDOWN_POSITIONS[this.position()])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategyOptions.reposition(),
      panelClass: ['wr-dropdown-overlay', `wr-dropdown--${this.position()}`],
    });

    const portal = new TemplatePortal(this.dropdownMenu()!.contentTpl, this.viewContainerRef);

    this.overlayRef.attach(portal);

    if (this.trigger() === 'hover') {
      this.setupHoverEvents();
    } else {
      this.setupClickEvents();
    }

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          this.clickTimeStamp = event.timeStamp;
          this.isOpen.set(false);
        }
      });

    setTimeout(() => {
      this.overlayRef?.updatePosition();
    });
  }

  private setupClickEvents(): void {
    this.overlayRef!.outsidePointerEvents()
      .pipe(
        filter(event => !this.elementRef.nativeElement.contains(event.target)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.clickTimeStamp = event.timeStamp;
        this.isOpen.set(false);
      });
  }

  private setupHoverEvents(): void {
    const overlayElement = this.overlayRef!.overlayElement;
    const triggerElement = this.elementRef.nativeElement;

    const triggerLeave$ = fromEvent<MouseEvent>(triggerElement, 'mouseleave').pipe(
      filter(event => {
        const relatedTarget = event.relatedTarget as Element;
        return !overlayElement.contains(relatedTarget) && relatedTarget !== overlayElement;
      })
    );

    const overlayLeave$ = fromEvent<MouseEvent>(overlayElement, 'mouseleave').pipe(
      filter(event => {
        const relatedTarget = event.relatedTarget as Element;
        return !triggerElement.contains(relatedTarget) && relatedTarget !== triggerElement;
      })
    );

    merge(triggerLeave$, overlayLeave$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!triggerElement.matches(':hover') && !overlayElement.matches(':hover')) {
          this.isOpen.set(false);
        }
      });

    fromEvent(overlayElement, 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isOpen.set(true);
      });
  }

  private close(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.destroyOverlay();
    }
  }

  private destroyOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = undefined;
    }
  }
}
