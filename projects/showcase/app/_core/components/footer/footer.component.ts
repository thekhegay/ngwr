import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';

import { NGWR_VERSION } from '#core/version';

@Component({
  selector: 'ngwr-footer',
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  @HostBinding('class') class = 'ngwr-footer';

  readonly version: string = NGWR_VERSION;
  readonly currentYear: number = new Date().getFullYear();
}
