import { Component } from '@angular/core';

import { Sparkles } from 'lucide';
import { WrAlert, type WrAlertType } from 'ngwr/alert';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-alert-page',
  templateUrl: './alert.html',
  imports: [WrAlert, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [provideWrIcons(lucideIcons({ sparkles: Sparkles }))],
})
export default class AlertComponent {
  protected readonly types: readonly WrAlertType[] = ['info', 'success', 'warning', 'danger', 'neutral', 'offline'];

  protected readonly snippets = {
    install: `import { WrAlert } from 'ngwr/alert';

@Component({ imports: [WrAlert] })
export class MyComponent {}`,
    basic: `<wr-alert title="Heads up" message="Your trial ends in 3 days." />`,
    types: `<wr-alert title="Info" type="info" />
<wr-alert title="Success" type="success" />
<wr-alert title="Warning" type="warning" />
<wr-alert title="Danger" type="danger" />
<wr-alert title="Neutral" type="neutral" />
<wr-alert title="Offline" type="offline" />`,
    withTitle: `<wr-alert title="Update available" message="Version 2.0 is ready to install." type="info" />`,
    noTitle: `<wr-alert message="Your changes are live." type="success" />
<wr-alert message="Connection lost." type="offline" />`,
    customIcon: `<wr-alert iconName="sparkles" title="What's new" message="Smarter search just landed." />`,
    closeable: `<wr-alert title="Saved" type="success" closeable (closed)="onClose()" />`,
    noIcon: `<wr-alert title="Plain" message="No leading icon." [icon]="false" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'title', description: 'Optional headline.', type: 'string | null', default: 'null' },
    {
      name: 'type',
      description: 'Visual variant.',
      type: "'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'offline'",
      default: "'info'",
    },
    { name: 'message', description: 'Optional secondary message.', type: 'string | null', default: 'null' },
    {
      name: 'iconName',
      description: 'Override the default per-type icon with any ngwr icon name.',
      type: 'WrIconName | null',
      default: 'null',
    },
    {
      name: 'icon',
      description: 'Show a leading status icon matching the `type`. Pass `false` to hide.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'closeable', description: 'Show a close button.', type: 'boolean', default: 'false' },
    {
      name: '(closed)',
      description: 'Fires when the close button is clicked.',
      type: 'EventEmitter<void>',
      default: '—',
    },
  ];
}
