import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';

import { ThemeService, SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent implements OnInit {
  @HostBinding('class') class = 'ngwr-layout';

  constructor(private readonly darkModeService: ThemeService, private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setRobots();
    this.darkModeService.init();
  }
}
