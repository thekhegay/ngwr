import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';
import { BehaviorSubject, takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { DarkModeService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent extends WrAbstractBase implements OnInit {
  @HostBinding('class') class = 'ngwr-header';
  @HostBinding('role') role = 'header';

  readonly isDarkModeEnabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private readonly darkModeService: DarkModeService) {
    super();
  }

  ngOnInit(): void {
    this.darkModeService.isDarkModeEnabled$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(is => this.isDarkModeEnabled$.next(is));
  }

  onDarkModeToggle(): void {
    this.darkModeService.toggleDarkTheme();
  }
}
