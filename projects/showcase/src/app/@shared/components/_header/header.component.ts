import { Component, HostBinding, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { DarkModeService } from 'showcase/@shared/services';

@Component({
  selector: 'app-header',
  templateUrl: 'header.component.html',
})
export class HeaderComponent extends WrAbstractBase implements OnInit {
  @HostBinding('class') class = 'header';
  @HostBinding('role') role = 'header';

  public isDarkModeEnabled = false;

  constructor(private readonly darkModeService: DarkModeService) {
    super();
  }

  ngOnInit(): void {
    this.darkModeService.isDarkModeEnabled$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(is => (this.isDarkModeEnabled = is));
  }

  onDarkModeToggle(): void {
    this.darkModeService.toggleDarkTheme();
  }
}
