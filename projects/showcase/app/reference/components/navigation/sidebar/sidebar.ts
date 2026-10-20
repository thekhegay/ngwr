import { Component } from '@angular/core';

import { Folder, House, Settings } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { WrSidebar, type WrSidebarEntry } from 'ngwr/sidebar';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-sidebar-page',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  imports: [WrSidebar, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [provideWrIcons(lucideIcons({ home: House, folder: Folder, cog: Settings }))],
})
export default class SidebarPage {
  /**
   * Only `Profile`, a group child, points at this page: its group opens and its
   * row is active. `check:state-a11y` measures `.wr-sidebar__item--active` here.
   */
  protected readonly entries: readonly WrSidebarEntry[] = [
    { title: 'Dashboard', icon: 'home', url: ['/reference/components', 'card'] },
    {
      title: 'Workspace',
      icon: 'folder',
      children: [
        { title: 'Projects', url: ['/reference/components', 'table'] },
        { title: 'Members', url: ['/reference/components', 'avatar'], badge: '12' },
        { title: 'Billing', url: ['/reference/components', 'statistic'], badge: 'new' },
      ],
    },
    {
      title: 'Settings',
      icon: 'cog',
      children: [
        { title: 'Profile', url: ['/reference/components', 'sidebar'] },
        { title: 'Security', url: ['/reference/components', 'input-otp'] },
        { title: 'Tokens (soon)', url: ['/reference/components', 'descriptions'], disabled: true },
      ],
    },
  ];

  protected readonly snippets = {
    template: `<wr-sidebar [entries]="entries" />`,
    activeOptions: `protected readonly entries: WrSidebarEntry[] = [
  // Without exact, '/' matches every URL
  { title: 'Home', url: ['/'], activeOptions: { exact: true } },
  { title: 'Orders', url: ['/orders'] }, // stays active on /orders/42
];`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'entries',
      description: 'Links and expandable groups, in order.',
      type: 'readonly WrSidebarEntry[]',
      default: '[]',
    },
    {
      name: 'ariaLabel',
      description: 'Name of the navigation landmark. Falls back to `sidebar.label`.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'defaultGroupIcon',
      description: "Icon shown when a group's `icon` is omitted.",
      type: 'string',
      default: "'folder'",
    },
    {
      name: 'defaultItemIcon',
      description: "Icon shown when an item's `icon` is omitted.",
      type: 'string',
      default: "'caret-forward'",
    },
    {
      name: 'autoExpand',
      description: 'Open the group holding the active route.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'WrSidebarItem',
      description: '`{ title, url, icon?, badge?, disabled?, activeOptions? }`: a link.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarGroup',
      description: '`{ title, children, icon?, defaultOpen? }`: a group of links.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarActiveOptions',
      description: "`{ exact: boolean }` or any subset of the router's own match options.",
      type: 'type',
      default: '—',
    },
  ];
}
