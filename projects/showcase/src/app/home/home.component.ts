import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { ThemeService, SeoService } from 'showcase/@core/services';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { NGWR_VERSION } from 'showcase/@shared/version';
import { WrAbstractBase } from 'ngwr/core/abstract';

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent extends WrAbstractBase implements OnInit {
  constructor(private readonly darkModeService: ThemeService, private readonly seoService: SeoService) {
    super();
  }

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Installation');
    this.seoService.setDescription('NGWR installation');
    this.seoService.setKeywords(['install', 'installation']);
    this.darkModeService.isDarkModeEnabled$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(is => this.isDarkModeEnabled$.next(is));
  }

  readonly isDarkModeEnabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  readonly version: string = NGWR_VERSION;

  onDarkModeToggle(): void {
    this.darkModeService.toggleDarkTheme();
  }
}
