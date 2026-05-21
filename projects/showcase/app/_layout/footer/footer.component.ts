import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

import { NGWR_VERSION } from '#core/version';

@Component({
  selector: 'ngwr-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-footer', role: 'contentinfo' },
})
export class FooterComponent {
  protected readonly version = NGWR_VERSION;
  protected readonly copyright = `2022 – ${new Date().getFullYear()} © Roman Khegay`;
  protected readonly npmLink = 'https://www.npmjs.com/package/ngwr';
}
