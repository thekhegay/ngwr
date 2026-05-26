import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrAlert, type WrAlertType } from 'ngwr/alert';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrAlert, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class AlertComponent {
  protected readonly types: readonly WrAlertType[] = ['info', 'success', 'warning', 'danger'];

  protected readonly snippets = {
    install: `import { WrAlert } from 'ngwr/alert';

@Component({ imports: [WrAlert] })
export class MyComponent {}`,
    basic: `<wr-alert title="Heads up" message="Your trial ends in 3 days." />`,
    types: `<wr-alert title="Info" type="info" />
<wr-alert title="Success" type="success" />
<wr-alert title="Warning" type="warning" />
<wr-alert title="Danger" type="danger" />`,
    closeable: `<wr-alert title="Saved" type="success" closeable (closed)="onClose()" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'title', description: 'Headline.', type: 'string', required: true },
    { name: 'type', description: 'Visual variant.', type: 'WrAlertType', default: "'info'" },
    { name: 'message', description: 'Optional secondary message.', type: 'string | null', default: 'null' },
    { name: 'closeable', description: 'Show a close button.', type: 'boolean', default: 'false' },
    {
      name: '(closed)',
      description: 'Fires when the close button is clicked.',
      type: 'EventEmitter<void>',
      default: '—',
    },
  ];
}
