import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-badge-log-page',
  templateUrl: './badge-log.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class BadgeLogPage {
  protected readonly snippet = `import { badgeLog } from 'ngwr/utils';

badgeLog('SAVED', '#10b981', 'profile updated');`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'badgeLog(badge, color, message)',
      description: "Logs `message` after a `badge` pill. `color` paints the pill's border and text, not a fill.",
      type: '(badge, color, message) => void',
      default: '—',
    },
  ];
}
