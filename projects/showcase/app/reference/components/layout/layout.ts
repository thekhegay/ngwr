import { Component, signal } from '@angular/core';

import { WrLayout, WrLayoutContent, WrLayoutFooter, WrLayoutHeader, WrLayoutSider } from 'ngwr/layout';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-layout-page',
  templateUrl: './layout.html',
  imports: [
    WrLayout,
    WrLayoutHeader,
    WrLayoutSider,
    WrLayoutContent,
    WrLayoutFooter,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class LayoutPageComponent {
  protected readonly collapsed = signal(false);

  protected toggleSider(): void {
    this.collapsed.update(v => !v);
  }

  protected readonly snippets = {
    install: `import {
  WrLayout,
  WrLayoutHeader,
  WrLayoutSider,
  WrLayoutContent,
  WrLayoutFooter
} from 'ngwr/layout';`,

    basic: `<wr-layout>
  <wr-layout-header>App bar</wr-layout-header>
  <wr-layout-content>Main</wr-layout-content>
  <wr-layout-footer>© 2026</wr-layout-footer>
</wr-layout>`,

    withSider: `<wr-layout>
  <wr-layout-header>App bar</wr-layout-header>
  <wr-layout>
    <wr-layout-sider [(collapsed)]="collapsed">Sidebar</wr-layout-sider>
    <wr-layout-content>Main</wr-layout-content>
  </wr-layout>
</wr-layout>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-layout>',
      description:
        'Flex container. Lays out as a column by default; switches to a row when a `<wr-layout-sider>` is among its direct children.',
      type: 'component',
      default: '—',
    },
    {
      name: '<wr-layout-header>',
      description: 'Top bar (`role="banner"`). Doesn\'t grow.',
      type: 'component',
      default: '—',
    },
    {
      name: '<wr-layout-sider>',
      description:
        'Collapsible side panel. `[(collapsed)]`, `width`, `collapsedWidth`, `reverse`. `toggle()` flips collapsed state.',
      type: 'component',
      default: '—',
    },
    {
      name: '<wr-layout-content>',
      description: 'Main area (`role="main"`). Flex-grows to fill.',
      type: 'component',
      default: '—',
    },
    {
      name: '<wr-layout-footer>',
      description: 'Bottom bar (`role="contentinfo"`). Doesn\'t grow.',
      type: 'component',
      default: '—',
    },
  ];
}
