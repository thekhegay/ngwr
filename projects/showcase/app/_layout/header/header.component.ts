import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  InjectionToken,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { BehaviorSubject, filter, takeUntil } from 'rxjs';

import { WrAvatarComponent } from 'ngwr/avatar';
import { WrAbstractBase } from 'ngwr/cdk';
import { isDefined } from 'ngwr/cdk/rxjs';
import { provideWrIcons, WrIconComponent, logoGithub, logoNpm, wrIconName } from 'ngwr/icon';

import { SIDEBAR_OPENED } from '#core/components';
import { routes } from '#routing';

interface MenuLink {
  url: string;
  name: string;
}

interface ActionLink {
  url: string;
  icon: wrIconName;
  class: string;
}

export const HEADER_HEIGHT = new InjectionToken<BehaviorSubject<number>>('ngwr_showcase_footer_height');

@Component({
  standalone: true,
  selector: 'ngwr-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, RouterLinkActive, WrAvatarComponent, WrIconComponent],
  providers: [provideWrIcons([logoGithub, logoNpm])],
})
export class HeaderComponent extends WrAbstractBase implements OnInit, AfterViewInit {
  @HostBinding('class') class = 'ngwr-header';
  @HostBinding('role') role = 'header';

  private readonly router = inject(Router);
  private readonly elRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly headerHeight$ = inject(HEADER_HEIGHT);
  private readonly sidebarOpened$ = inject(SIDEBAR_OPENED);

  protected readonly routes = routes;
  protected readonly isSidebarOpened = toSignal(this.sidebarOpened$);
  protected readonly isDocsPage = signal(false);
  protected readonly menuLinks: MenuLink[] = [{ url: '/docs', name: 'Docs' }];
  protected readonly actionLinks: ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'logo-github', class: 'github' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'logo-npm', class: 'npm' },
  ];

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.isDocsPage.set(this.router.url.includes('docs'));
      });
  }

  ngAfterViewInit(): void {
    const exactHeight = this.elRef.nativeElement?.offsetHeight || 0;
    const roundedUp = Math.ceil(exactHeight);
    this.headerHeight$.next(roundedUp);
  }

  onSidebarOpen(value?: boolean): void {
    let newValue = !this.isSidebarOpened();
    if (isDefined(value)) {
      newValue = value;
    }
    this.sidebarOpened$.next(newValue);
  }
}
