import { Component, signal } from '@angular/core';

import { Archive, BookOpen, Layers, Plus, Search } from 'lucide';
import { WrButton } from 'ngwr/button';
import { wrLucideIcons, provideWrIcons } from 'ngwr/icon';
import { WrSidebar, type WrSidebarEntry } from 'ngwr/sidebar';

import {
  type DocApiRow,
  type DocCodeFile,
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
  imports: [
    WrSidebar,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [
    provideWrIcons(wrLucideIcons({ book: BookOpen, layers: Layers, archive: Archive, search: Search, plus: Plus })),
  ],
})
export default class SidebarPage {
  /**
   * Only `Sidebar` points at this page: its two groups open and its row is the
   * current page. `check:state-a11y` measures `.wr-sidebar__row--active` here.
   */
  protected readonly entries: readonly WrSidebarEntry[] = [
    { title: 'Introduction', icon: 'book', url: ['/reference/components', 'button'] },
    {
      title: 'Components',
      icon: 'layers',
      count: 4,
      countLabel: '4 pages',
      children: [
        {
          title: 'Form',
          subtitle: 'Signal Forms controls',
          count: 3,
          countLabel: '3 pages',
          defaultOpen: true,
          children: [
            { title: 'Checkbox', url: ['/reference/components', 'checkbox'] },
            {
              title: 'Editor',
              subtitle: 'ProseMirror peer',
              badge: { text: 'Optional' },
              url: ['/reference/components', 'editor'],
            },
            { title: 'Signature pad', badge: { text: 'Soon' }, url: [], disabled: true },
          ],
        },
        {
          title: 'Graph',
          subtitle: 'Nodes and edges',
          badge: { text: 'New', tone: 'primary' },
          url: ['/reference/components', 'graph'],
        },
        {
          title: 'Navigation',
          url: ['/reference/components', 'tabs'],
          children: [
            { title: 'Breadcrumbs', url: ['/reference/components', 'breadcrumbs'] },
            { title: 'Sidebar', url: ['/reference/components', 'sidebar'] },
          ],
        },
      ],
    },
    {
      title: 'Legacy',
      icon: 'archive',
      children: [
        {
          title: 'Drag drop',
          subtitle: 'Use Sortable list',
          badge: { text: 'Deprecated', tone: 'danger' },
          url: ['/reference/components', 'sortable-list'],
        },
      ],
    },
  ];

  protected readonly lastAction = signal('none yet');

  protected readonly actionEntries: readonly WrSidebarEntry[] = [
    { title: 'Search', icon: 'search', shortcut: 'mod+k', action: () => this.lastAction.set('Search') },
    { title: 'New page', icon: 'plus', action: () => this.lastAction.set('New page') },
    { title: 'Import', icon: 'archive', badge: { text: 'Soon' }, disabled: true, action: () => undefined },
    { title: 'Tabs', icon: 'layers', url: ['/reference/components', 'tabs'] },
  ];

  protected readonly slotEntries: readonly WrSidebarEntry[] = [
    { title: 'Tabs', url: ['/reference/components', 'tabs'] },
    { title: 'Breadcrumbs', url: ['/reference/components', 'breadcrumbs'] },
  ];

  /** The current page twice: a level-1 row wears the tint, a nested one the bar. */
  protected readonly toneEntries: readonly WrSidebarEntry[] = [
    { title: 'Sidebar', icon: 'layers', url: ['/reference/components', 'sidebar'] },
    { title: 'Tabs', icon: 'book', url: ['/reference/components', 'tabs'] },
    {
      title: 'Navigation',
      icon: 'archive',
      defaultOpen: true,
      children: [
        { title: 'Breadcrumbs', url: ['/reference/components', 'breadcrumbs'] },
        { title: 'Sidebar', url: ['/reference/components', 'sidebar'] },
      ],
    },
  ];

  protected readonly actionFiles: readonly DocCodeFile[] = [
    { label: 'HTML', language: 'angular-html', code: `<wr-sidebar [entries]="entries" />` },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `protected readonly entries: WrSidebarEntry[] = [
  // shortcut: the keycap and aria-keyshortcuts. Bind the chord with ngwr/hotkey.
  { title: 'Search', icon: 'search', shortcut: 'mod+k', action: () => this.searchOpen.set(true) },
  { title: 'New page', icon: 'plus', action: () => this.create() },
  { title: 'Import', badge: { text: 'Soon' }, disabled: true, action: () => this.import() },
  { title: 'Tabs', url: ['/tabs'] },
];`,
    },
  ];

  protected readonly snippets = {
    slots: `<wr-sidebar [entries]="entries">
  <button wr-btn wrSidebarHeader block color="primary" (click)="create()">New page</button>
  <button wr-btn wrSidebarFooter block outlined (click)="signOut()">Sign out</button>
</wr-sidebar>`,
    tone: `<wr-sidebar [entries]="entries" activeTone="neutral" />`,
    toneHooks: `.wr-sidebar {
  --wr-sidebar-row-active-bg: var(--wr-color-success-soft); // level-1 tint
  --wr-sidebar-row-active-color: var(--wr-color-success-ink); // text
  --wr-sidebar-row-active-icon: var(--wr-color-success); // icon
  --wr-sidebar-row-active-indicator: var(--wr-color-success); // nested bar, group dot
}`,
    template: `<wr-sidebar [entries]="entries" />`,
    rows: `protected readonly entries: WrSidebarEntry[] = [
  { title: 'Introduction', icon: 'book', url: ['/intro'] },
  {
    title: 'Components',
    count: 4,
    countLabel: '4 pages', // what a screen reader hears
    children: [
      {
        title: 'Graph',
        subtitle: 'Nodes and edges',
        badge: { text: 'New', tone: 'primary' }, // 'neutral' | 'primary' | 'danger'
        url: ['/components/graph'],
      },
      {
        title: 'Navigation',
        url: ['/components/navigation'], // also a page: the arrow opens it
        children: [{ title: 'Sidebar', url: ['/components/sidebar'] }],
      },
    ],
  },
];`,
    activeOptions: `protected readonly entries: WrSidebarEntry[] = [
  // Without exact, '/' matches every URL
  { title: 'Home', url: ['/'], activeOptions: { exact: true } },
  { title: 'Orders', url: ['/orders'] }, // stays active on /orders/42
];`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'entries',
      description: 'Pages, groups and actions, in order. Groups nest three levels deep.',
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
      description: 'Icon for a group whose `icon` is omitted. `null` draws none.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'defaultItemIcon',
      description: 'Icon for a page whose `icon` is omitted. `null` draws none.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'autoExpand',
      description: 'Open every group above the current route.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'autoCollapse',
      description: 'Close the groups the last navigation opened when the next one leaves them.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'activeTone',
      description: 'How the current page is painted: the primary tint or a neutral grey.',
      type: "'primary' | 'neutral'",
      default: "'primary'",
    },
    {
      name: '[wrSidebarHeader]',
      description: 'Slot above the rows, inside the landmark.',
      type: 'slot',
      default: '—',
    },
    {
      name: '[wrSidebarFooter]',
      description: 'Slot below the rows, at the end of the host.',
      type: 'slot',
      default: '—',
    },
    {
      name: 'WrSidebarRow',
      description: '`{ title, subtitle?, icon?, badge?, count?, countLabel? }`: what every row shows.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarItem',
      description: '`WrSidebarRow` plus `{ url, disabled?, activeOptions? }`: a page.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarGroup',
      description: '`WrSidebarRow` plus `{ children, url?, defaultOpen? }`: a group, and a page too with `url`.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarAction',
      description: '`WrSidebarRow` plus `{ action, shortcut?, disabled? }`: a button that calls `action`.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrSidebarBadge',
      description: "`{ text, tone? }`, where `tone` is `'neutral'`, `'primary'` or `'danger'`.",
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
