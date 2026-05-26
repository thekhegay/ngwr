import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrContextMenu, WrContextMenuPanel, WrContextMenuItem } from 'ngwr/context-menu';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrContextMenu,
    WrContextMenuPanel,
    WrContextMenuItem,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ContextMenuPageComponent {
  protected last = '';

  protected pick(action: string): void {
    this.last = action;
  }

  protected readonly snippets = {
    install: `import { WrContextMenu, WrContextMenuPanel, WrContextMenuItem } from 'ngwr/context-menu';

@Component({ imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem] })
export class MyComponent {}`,
    basic: `<div [wrContextMenu]="menu">Right-click me</div>

<wr-context-menu #menu>
  <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
  <wr-context-menu-item icon="document" (click)="paste()">Paste</wr-context-menu-item>
  <wr-context-menu-item icon="trash" (click)="remove()">Delete</wr-context-menu-item>
</wr-context-menu>`,
  };

  protected readonly directiveApi: readonly DocApiRow[] = [
    {
      name: '[wrContextMenu]',
      type: 'WrContextMenu',
      default: '—',
      description: 'Menu to open. Required.',
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
  ];
}
