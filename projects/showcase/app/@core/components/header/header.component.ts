import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';
import { BehaviorSubject, takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { ThemeService } from 'showcase/@core/services';

interface MenuLink {
  url: string;
  name: string;
}

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent extends WrAbstractBase implements OnInit {
  @HostBinding('class') class = 'ngwr-header';
  @HostBinding('role') role = 'header';

  readonly menuLinks: MenuLink[] = [{ url: '/docs', name: 'Docs' }];
  readonly isDarkModeEnabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private readonly themeService: ThemeService) {
    super();
  }

  ngOnInit(): void {
    this.themeService.isDarkModeEnabled$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(is => this.isDarkModeEnabled$.next(is));
  }

  onDarkModeToggle(): void {
    this.themeService.toggleDarkTheme();
  }
}
