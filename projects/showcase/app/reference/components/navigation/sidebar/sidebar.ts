import { Component } from '@angular/core';

import { Archive, BookOpen, Layers } from 'lucide';
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
  providers: [provideWrIcons(lucideIcons({ book: BookOpen, layers: Layers, archive: Archive }))],
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

  protected readonly snippets = {
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
      description: 'Pages and groups, in order. Groups nest three levels deep.',
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
