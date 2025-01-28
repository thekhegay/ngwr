import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';

import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-installation',
  templateUrl: './installation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrTagComponent, CodeComponent],
})
export class InstallationComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Installation';
  protected readonly pageDescription = 'You can easily install NGWR by running the following commands';

  protected readonly code = {
    installNpm: `$ npm install ngwr`,
    installYarn: `$ yarn add ngwr`,
    installPnpm: `$ pnpm add ngwr`,
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Installation');
    this.seoService.setDescription('NGWR installation');
    this.seoService.setKeywords(['install', 'installation']);
  }
}
