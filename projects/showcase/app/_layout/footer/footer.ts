import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WR_VERSION_TOKEN } from 'ngwr/version';

@Component({
  selector: 'ngwr-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly version = inject(WR_VERSION_TOKEN);
  protected readonly copyright = `2022 – ${new Date().getFullYear()} © Roman Khegay`;
  protected readonly npmLink = 'https://www.npmjs.com/package/ngwr';
}
