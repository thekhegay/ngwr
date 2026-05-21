import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';

import { WR_VERSION_TOKEN } from 'ngwr/version';

@Component({
  selector: 'ngwr-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-footer', role: 'contentinfo' },
})
export class FooterComponent {
  protected readonly version = inject(WR_VERSION_TOKEN);
  protected readonly copyright = `2022 – ${new Date().getFullYear()} © Roman Khegay`;
  protected readonly npmLink = 'https://www.npmjs.com/package/ngwr';
}
