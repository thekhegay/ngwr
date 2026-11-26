import { Component, signal } from '@angular/core';

import { Bell, Shield, User } from 'lucide';
import { provideWrIcons, wrLucideIcons } from 'ngwr/icon';
import { WrInput } from 'ngwr/input';
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
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(wrLucideIcons({ user: User, bell: Bell, shield: Shield }))],
})
export default class TabsPageComponent {
  protected readonly active = signal<string | null>('overview');

  protected readonly snippets = {
    basic: `<wr-tabs [(active)]="key">
  <wr-tab key="overview" title="Overview">Overview content…</wr-tab>
  <wr-tab key="details"  title="Details">Details content…</wr-tab>
  <wr-tab key="logs"     title="Logs">Logs content…</wr-tab>
</wr-tabs>`,
    router: `<!-- imports: [WrTabs, WrTab, WrTabsRouting] from 'ngwr/tabs' + 'ngwr/tabs/router' -->
<wr-tabs wrTabsRouting>
  <wr-tab title="Overview" routerLink="overview" />
  <wr-tab title="Details"  routerLink="details" />
  <wr-tab title="Logs"     routerLink="logs" />
</wr-tabs>
<router-outlet />`,
    exact: `<wr-tabs wrTabsRouting>
  <!-- not selected on /project/42/settings -->
  <wr-tab title="Overview" routerLink="/project/42" exact />
  <wr-tab title="Settings" routerLink="/project/42/settings" />
</wr-tabs>`,
    count: `<wr-tabs>
  <wr-tab title="Inbox" [count]="unread()">…</wr-tab>
  <wr-tab title="Sent">…</wr-tab>
</wr-tabs>`,
    keepMounted: `<wr-tabs keepMounted>
  <wr-tab key="draft" title="Draft"><input wrInput /></wr-tab>
  <wr-tab key="other" title="Other">…</wr-tab>
</wr-tabs>`,
    icon: `<wr-tabs>
  <wr-tab title="Profile" icon="user">…</wr-tab>
  <wr-tab title="Alerts" icon="bell" [count]="2">…</wr-tab>
</wr-tabs>`,
    vertical: `<wr-tabs orientation="vertical">
  <wr-tab title="Profile">…</wr-tab>
  <wr-tab title="Alerts">…</wr-tab>
</wr-tabs>`,
    disabled: `<wr-tab title="WIP" disabled>…</wr-tab>`,
    exportAs: `<wr-tabs wrTabsRouting #routing="wrTabsRouting">
  <wr-tab title="Overview" routerLink="overview" />
  <wr-tab title="Details" routerLink="details" />
</wr-tabs>

<!-- Anywhere else in the same template -->
<a [href]="routing.href('overview')">Permalink to the first tab</a>`,
  };

  protected readonly tabsApi: readonly DocApiRow[] = [
    { name: 'active', description: 'Active tab key. Two-way bindable.', type: 'string | null', default: 'null' },
    { name: 'size', description: 'Visual size variant.', type: "'sm' | 'md' | 'lg'", default: "'md'" },
    {
      name: 'orientation',
      description: 'Axis of the strip. `vertical` puts it at the inline start; Up and Down move between tabs.',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
    },
    {
      name: 'keepMounted',
      description: 'Render each panel on its first visit and keep it, hidden. Content tabs only.',
      type: 'boolean',
      default: 'false',
    },
  ];

  protected readonly tabApi: readonly DocApiRow[] = [
    { name: 'title', description: 'Visible label.', type: 'string', required: true },
    { name: 'key', description: 'Stable id.', type: 'string', default: 'auto' },
    {
      name: 'routerLink',
      description: 'Makes the tab a link; the strip renders no panel.',
      type: 'string | readonly string[] | null',
      default: 'null',
    },
    {
      name: 'exact',
      description: 'Router tab: selected on its own path only, not on the paths below it.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'count',
      description: 'A count badge after the label; part of the accessible name. `null` hides it.',
      type: 'number | null',
      default: 'null',
    },
    {
      name: 'icon',
      description: 'A registered icon before the label. Decorative.',
      type: 'WrIconName | null',
      default: 'null',
    },
    { name: 'disabled', description: 'Disable the tab.', type: 'boolean', default: 'false' },
  ];
}
