import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-badge-log-page',
  templateUrl: './wr-badge-log.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrBadgeLogPage {
  protected readonly snippet = `import { wrBadgeLog } from 'ngwr/utils';

wrBadgeLog('SAVED', '#10b981', 'profile updated');`;

  protected readonly levelsSnippet = `import { wrBadgeError, wrBadgeWarn } from 'ngwr/utils';

wrBadgeWarn('CACHE', '#f59e0b', 'profile is stale');
wrBadgeError('SAVE', '#ef4444', new Error('profile not saved'));`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrBadgeLog(badge, color, message)',
      description: "Logs `message` after a `badge` pill. `color` paints the pill's border and text, not a fill.",
      type: '(badge, color, message) => void',
      default: '—',
    },
    {
      name: 'wrBadgeWarn(badge, color, message)',
      description: 'The same through `console.warn`.',
      type: '(badge, color, message) => void',
      default: '—',
    },
    {
      name: 'wrBadgeError(badge, color, message)',
      description: 'The same through `console.error`.',
      type: '(badge, color, message) => void',
      default: '—',
    },
  ];
}
