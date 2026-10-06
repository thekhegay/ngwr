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
  /**
   * Distinct destinations, and exactly ONE of them resolves here — the entry
   * that is a visible CHILD of a group.
   *
   * Every entry used to name this page, so `routerLinkActive` matched all six at
   * once and the active treatment was indistinguishable from the inactive one,
   * the single thing the section exists to show. Pointing them at real routes
   * fixed that and broke the other half: the only row left matching was
   * `Dashboard`, a top-level entry, so nothing on the page carried
   * `.wr-sidebar__item--active` and no group expanded for a reason a reader can
   * see. `Settings` DID open — `Tokens (soon)` named this route — but a disabled
   * entry renders as a `<span>`, which `routerLinkActive` never touches, so the
   * group opened because of an inert row with no highlight on it. The page
   * promises "active route auto-expands its containing group" directly above.
   *
   * So `Profile` is the one that resolves here: its group opens on load, the row
   * inside it is highlighted, and the promise is demonstrated by something
   * visible. `check:state-a11y` measures `.wr-sidebar__item--active` on this
   * route and went unreachable for exactly as long as no child was active.
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
  // Without this, \`/\` is a prefix of every URL, so Home paints as
  // the current page everywhere — and the active row ignores the pointer.
  { title: 'Home', url: ['/'], activeOptions: { exact: true } },
  { title: 'Orders', url: ['/orders'] }, // stays active on /orders/42
];`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'entries',
      description: 'Flat items + expandable groups. Order preserved.',
      type: 'readonly WrSidebarEntry[]',
      default: '[]',
    },
    {
      name: 'ariaLabel',
      description: 'Accessible name for the navigation landmark. Falls back to the `sidebar.label` catalog key.',
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
      description: 'Auto-expand the group containing the active route on navigation.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'WrSidebarItem',
      description:
        "`{ title, url, icon?, badge?, disabled?, activeOptions? }` — a direct-link entry. `activeOptions` is the entry's `[routerLinkActiveOptions]`.",
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarGroup',
      description: '`{ title, children, icon?, defaultOpen? }` — expand to reveal child items.',
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
