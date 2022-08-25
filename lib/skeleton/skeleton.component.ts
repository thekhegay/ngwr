import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  ViewEncapsulation
} from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'wr-skeleton',
  exportAs: 'wrSkeleton',
  preserveWhitespaces: false,
  template: '<span>&nbsp;</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrSkeletonComponent implements AfterViewInit, OnDestroy {
  @Input() color: 'light' | 'dark' = 'dark';
  @HostBinding('class') classes = `wr-skeleton`;

  private destroy$ = new Subject<void>();

  constructor(private readonly el: ElementRef) {}

  ngAfterViewInit() {
    const style = this.color === 'light' ? 'var(--color-white-rgb)' : 'var(--color-dark-rgb)';
    this.el.nativeElement.style.setProperty('--skeleton-style', style);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
