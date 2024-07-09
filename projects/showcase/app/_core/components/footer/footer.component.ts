import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  InjectionToken,
  ViewEncapsulation,
} from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { NGWR_VERSION } from '#core/version';

export const FOOTER_HEIGHT = new InjectionToken<BehaviorSubject<number>>('ngwr_showcase_footer_height');

@Component({
  standalone: true,
  selector: 'ngwr-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FooterComponent implements AfterViewInit {
  @HostBinding() class = 'ngwr-footer';

  private readonly elRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly footerHeight$ = inject(FOOTER_HEIGHT);
  protected readonly version: string = NGWR_VERSION;
  protected readonly copyright = `2022 – ${new Date().getFullYear()} © Roman Khegay`;
  protected readonly npmLink = 'https://www.npmjs.com/package/ngwr';

  ngAfterViewInit(): void {
    const exactHeight = this.elRef.nativeElement?.offsetHeight || 0;
    const roundedUp = Math.ceil(exactHeight);
    this.footerHeight$.next(roundedUp);
  }
}
