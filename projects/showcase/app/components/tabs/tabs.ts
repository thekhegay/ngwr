import { Component, signal } from '@angular/core';

import { WrTab, WrTabs } from 'ngwr/tabs';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tabs-page',
  templateUrl: './tabs.html',
  imports: [
    WrTabs,
    WrTab,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TabsPageComponent {
  protected readonly active = signal<string | null>('overview');

  protected readonly snippets = {
    install: `import { WrTabs, WrTab } from 'ngwr/tabs';

@Component({ imports: [WrTabs, WrTab] })
export class MyComponent {}`,
    basic: `<wr-tabs [(active)]="key">
  <wr-tab key="overview" title="Overview">Overview content…</wr-tab>
  <wr-tab key="details"  title="Details">Details content…</wr-tab>
  <wr-tab key="logs"     title="Logs">Logs content…</wr-tab>
</wr-tabs>`,
    router: `<wr-tabs>
  <wr-tab title="Overview" routerLink="overview" />
  <wr-tab title="Details"  routerLink="details" />
  <wr-tab title="Logs"     routerLink="logs" />
</wr-tabs>
<router-outlet />`,
    disabled: `<wr-tab title="WIP" disabled>…</wr-tab>`,
  };

  protected readonly tabsApi: readonly DocApiRow[] = [
    { name: 'active', description: 'Active tab key. Two-way bindable.', type: 'string | null', default: 'null' },
    { name: 'size', description: 'Visual size variant.', type: "'sm' | 'md' | 'lg'", default: "'md'" },
  ];

  protected readonly tabApi: readonly DocApiRow[] = [
    { name: 'title', description: 'Visible label.', type: 'string', required: true },
    { name: 'key', description: 'Stable id.', type: 'string', default: 'auto' },
    {
      name: 'routerLink',
      description: 'When set, the tab becomes a [routerLink] link; the parent skips its content panel.',
      type: 'string | readonly string[] | null',
      default: 'null',
    },
    { name: 'disabled', description: 'Disable the tab.', type: 'boolean', default: 'false' },
  ];
}
