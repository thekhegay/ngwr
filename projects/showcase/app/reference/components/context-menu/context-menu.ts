import { Component } from '@angular/core';

import { FileText, Settings, Trash2 } from 'lucide';
import { WrContextMenu, WrContextMenuDivider, WrContextMenuItem, WrContextMenuPanel } from 'ngwr/context-menu';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-context-menu-page',
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.scss',
  imports: [
    WrContextMenu,
    WrContextMenuPanel,
    WrContextMenuItem,
    WrContextMenuDivider,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(lucideIcons({ document: FileText, trash: Trash2, cog: Settings }))],
})
export default class ContextMenuPageComponent {
  protected last = '';

  protected pick(action: string): void {
    this.last = action;
  }

  protected readonly snippets = {
    install: `import {
  WrContextMenu,
  WrContextMenuPanel,
  WrContextMenuItem,
  WrContextMenuDivider,
} from 'ngwr/context-menu';

@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem, WrContextMenuDivider],
})
export class MyComponent {}`,

    basic: `<div [wrContextMenu]="menu">Right-click me</div>

<wr-context-menu #menu>
  <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
  <wr-context-menu-item icon="document" (click)="paste()">Paste</wr-context-menu-item>
  <wr-context-menu-item icon="trash" (click)="remove()">Delete</wr-context-menu-item>
</wr-context-menu>`,

    divider: `<wr-context-menu #menu>
  <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
  <wr-context-menu-item icon="document" (click)="paste()">Paste</wr-context-menu-item>
  <wr-context-menu-item icon="cog" (click)="settings()">Settings</wr-context-menu-item>

  <wr-context-menu-divider />

  <wr-context-menu-item icon="trash" (click)="remove()">Delete</wr-context-menu-item>
</wr-context-menu>`,

    submenu: `<div [wrContextMenu]="rootMenu">Right-click me</div>

<wr-context-menu #rootMenu>
  <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
  <wr-context-menu-item icon="document" (click)="paste()">Paste</wr-context-menu-item>
  <wr-context-menu-divider />
  <wr-context-menu-item icon="cog" [submenu]="shareMenu">Share</wr-context-menu-item>
  <wr-context-menu-divider />
  <wr-context-menu-item icon="trash" (click)="remove()">Delete</wr-context-menu-item>
</wr-context-menu>

<!-- Nested submenu — hover the parent item to open. Pressing → also opens it. -->
<wr-context-menu #shareMenu>
  <wr-context-menu-item (click)="copyLink()">Copy link</wr-context-menu-item>
  <wr-context-menu-item (click)="emailLink()">Email…</wr-context-menu-item>
  <wr-context-menu-divider />
  <!-- Submenus can themselves own submenus — the API is recursive. -->
  <wr-context-menu-item [submenu]="exportMenu">Export as…</wr-context-menu-item>
</wr-context-menu>

<wr-context-menu #exportMenu>
  <wr-context-menu-item (click)="exportPdf()">PDF</wr-context-menu-item>
  <wr-context-menu-item (click)="exportPng()">PNG</wr-context-menu-item>
  <wr-context-menu-item (click)="exportSvg()">SVG</wr-context-menu-item>
</wr-context-menu>`,

    custom: `<wr-context-menu #menu>
  <!-- Anything projected between tags renders inline alongside items. -->
  <div class="my-header">
    <span class="my-header__title">readme.md</span>
    <span class="my-header__sub">2 KB · modified just now</span>
  </div>
  <wr-context-menu-divider />

  <!-- Items also project their own content — drop in keyboard hints,
       badges, or any inline element next to the label. -->
  <wr-context-menu-item icon="copy" (click)="copy()">
    Copy
    <span class="my-kbd">⌘C</span>
  </wr-context-menu-item>
  <wr-context-menu-item icon="document" (click)="paste()">
    Paste
    <span class="my-kbd">⌘V</span>
  </wr-context-menu-item>
</wr-context-menu>`,
  };

  protected readonly directiveApi: readonly DocApiRow[] = [
    {
      name: '[wrContextMenu]',
      type: 'WrContextMenuPanel',
      default: '—',
      description: 'Menu to open on right-click. Required.',
    },
  ];

  protected readonly itemApi: readonly DocApiRow[] = [
    {
      name: 'icon',
      type: 'WrIconName | null',
      default: 'null',
      description: 'Optional leading icon.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Suppress click + keyboard activation.',
    },
    {
      name: 'submenu',
      type: 'WrContextMenuPanel | null',
      default: 'null',
      description:
        'Optional nested menu. Opens to the right on hover or →. Shows a chevron indicator. ← (or click-outside) closes it.',
    },
  ];
}
