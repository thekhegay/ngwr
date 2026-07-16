import { Component } from '@angular/core';

import { Folder, House, Settings } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
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
  protected readonly entries: readonly WrSidebarEntry[] = [
    { title: 'Dashboard', icon: 'home', url: ['/reference/components', 'sidebar'] },
    {
      title: 'Workspace',
      icon: 'folder',
      children: [
        { title: 'Projects', url: ['/reference/components', 'sidebar'] },
        { title: 'Members', url: ['/reference/components', 'sidebar'], badge: '12' },
        { title: 'Billing', url: ['/reference/components', 'sidebar'], badge: 'new' },
      ],
    },
    {
      title: 'Settings',
      icon: 'cog',
      children: [
        { title: 'Profile', url: ['/reference/components', 'sidebar'] },
        { title: 'Security', url: ['/reference/components', 'sidebar'] },
        { title: 'Tokens (soon)', url: ['/reference/components', 'sidebar'], disabled: true },
      ],
    },
  ];

  protected readonly snippets = {
    install: `import { WrSidebar } from 'ngwr/sidebar';

@Component({ imports: [WrSidebar] })
export class MyComponent {
  protected readonly entries: WrSidebarEntry[] = [
    { title: 'Dashboard', icon: 'home', url: ['/dashboard'] },
    {
      title: 'Settings',
      icon: 'cog',
      children: [
        { title: 'Profile', url: ['/settings', 'profile'] },
        { title: 'Billing', url: ['/settings', 'billing'] },
      ],
    },
  ];
}`,
    template: `<wr-sidebar [entries]="entries" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'entries',
      description: 'Flat items + expandable groups. Order preserved.',
      type: 'readonly WrSidebarEntry[]',
      default: '[]',
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
      description: 'Auto-expand the group containing the active route on navigation.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'WrSidebarItem',
      description: '`{ title, url, icon?, badge?, disabled? }` — a direct-link entry.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarGroup',
      description: '`{ title, children, icon?, defaultOpen? }` — expand to reveal child items.',
      type: 'interface',
      default: '—',
    },
  ];
}
