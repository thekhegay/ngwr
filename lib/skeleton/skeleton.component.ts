import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  ViewEncapsulation
} from '@angular/core';
import { stylePrefix } from '../_core';

@Component({
  selector: 'wr-skeleton',
  template: '<span>&nbsp;</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrSkeletonComponent implements AfterViewInit {
  @Input() color: 'light' | 'dark' = 'dark';
  @HostBinding('class') class = `${stylePrefix}-skeleton`;

  constructor(
    private readonly elRef: ElementRef
  ) {}

  ngAfterViewInit() {
    const style = this.color === 'light' ? 'var(--color-white-rgb)' : 'var(--color-dark-rgb)';
    this.elRef.nativeElement.style.setProperty('--skeleton-style', style);
  }
}
