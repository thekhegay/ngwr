import { Component } from '@angular/core';

import { Sparkles } from 'lucide';
import { WrAlert, type WrAlertType } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { wrLucideIcons, provideWrIcons } from 'ngwr/icon';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-alert-page',
  templateUrl: './alert.html',
  imports: [WrAlert, WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
  providers: [provideWrIcons(wrLucideIcons({ sparkles: Sparkles }))],
})
export default class AlertComponent {
  protected readonly types: readonly WrAlertType[] = ['info', 'success', 'warning', 'danger', 'neutral', 'offline'];

  protected readonly snippets = {
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
    content: `<wr-alert title="Sync failed" type="danger">
  Request <code>8f2c41</code> timed out. Try again in a minute.
</wr-alert>`,
    actions: `<wr-alert title="Update available" message="Version 2.0 is ready to install." type="info" closable>
  <wr-btn wrAlertActions size="sm" color="primary" (click)="install()">Install</wr-btn>
  <wr-btn wrAlertActions size="sm" outlined (click)="later()">Later</wr-btn>
</wr-alert>`,
    customIcon: `<wr-alert iconName="sparkles" title="What's new" message="Smarter search just landed." />`,
    closable: `<wr-alert title="Saved" type="success" closable (closed)="onClose()" />`,
    noIcon: `<wr-alert title="Plain" message="No leading icon." [icon]="false" />`,
  };

  protected readonly api = API.WrAlert;
}
