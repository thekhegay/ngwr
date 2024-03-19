import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';

import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.component.html',
  styleUrls: ['home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  @HostBinding('class') class = 'ngwr-page';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('NGWR – Angular UI components library');
  }
}
