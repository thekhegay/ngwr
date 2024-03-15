import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';

import { ThemeService, SeoService } from '#core/services';

@Component({
  selector: 'ngwr-root',
  templateUrl: 'root.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootComponent implements OnInit {
  @HostBinding('class') class = 'ngwr-root';

  constructor(
    private readonly seoService: SeoService,
    private readonly themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.seoService.setTitle('NGWR – Angular UI components library');
    this.seoService.setRobots();
    this.themeService.init();
  }
}
