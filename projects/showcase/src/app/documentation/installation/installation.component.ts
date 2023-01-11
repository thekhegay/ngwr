import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-installation',
  templateUrl: './installation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallationComponent implements OnInit {
  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Installation');
    this.seoService.setDescription('NGWR installation');
    this.seoService.setKeywords(['install', 'installation']);
  }
}
