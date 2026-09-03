import { Component } from '@angular/core';

import { Sparkles } from 'lucide';
import { WrAlert, type WrAlertType } from 'ngwr/alert';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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
    closable: `<wr-alert title="Saved" type="success" closable (closed)="onClose()" />`,
    noIcon: `<wr-alert title="Plain" message="No leading icon." [icon]="false" />`,
  };

  protected readonly api = API.WrAlert;
}
