import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { combineLatest, filter, takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { isDefined } from 'ngwr/cdk/rxjs';
import { SafeAny } from 'ngwr/cdk/types';

import { FOOTER_HEIGHT, HEADER_HEIGHT, SIDEBAR_OPENED, SidebarComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
    selector: 'ngwr-layout',
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [RouterOutlet, SidebarComponent]
})
export class LayoutComponent extends WrAbstractBase implements OnInit {
  @HostBinding() class = 'ngwr-layout';

  private readonly bpObs$ = inject(BreakpointObserver);
  private readonly sidebarOpened$ = inject(SIDEBAR_OPENED);
  private readonly headerHeight$ = inject(HEADER_HEIGHT);
  private readonly footerHeight$ = inject(FOOTER_HEIGHT);
  private readonly seoService = inject(SeoService);

  protected readonly isSidebarOpened = toSignal(this.sidebarOpened$);
  protected readonly height = signal('calc(100vh - 0)');
  protected readonly isMd = signal(false);

  ngOnInit(): void {
    this.seoService.setRobots();

    this.bpObs$
      .observe(['(max-width: 768px)'])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(is => this.isMd.set(is.matches));

    this.headerHeight$.pipe(takeUntil(this.destroyed$)).subscribe(h => {
      this.height.set(`calc(100% - ${h}px`);
    });
  }

  onSidebarClose(): void {
    this.sidebarOpened$.next(false);
  }
}
