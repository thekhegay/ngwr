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

badgeLog('SAVED', '#10b981', 'profile updated');
// → renders a styled badge in the devtools console`;

  protected readonly whySnippet = `// Native — readable for the console, painful to write.
console.log(
  '%cSAVED',
  'background:#10b981;color:white;padding:2px 6px;border-radius:4px;font-weight:600',
  'profile updated'
);

// ngwr — same output, no string-of-CSS to typo.
badgeLog('SAVED', '#10b981', 'profile updated');`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'badgeLog(badge, color, message)',
      description: 'Styled badge log to the browser console — quick dev signal.',
      type: '(badge, color, message) => void',
      default: '—',
    },
  ];
}
