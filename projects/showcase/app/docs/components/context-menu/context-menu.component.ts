import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrContextMenuComponent, WrContextMenuDirective, WrContextMenuItemComponent } from 'ngwr/context-menu';

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
  templateUrl: './context-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrContextMenuComponent,
    WrContextMenuDirective,
    WrContextMenuItemComponent,
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
    install: `import { WrContextMenuComponent, WrContextMenuDirective, WrContextMenuItemComponent } from 'ngwr/context-menu';

@Component({ imports: [WrContextMenuComponent, WrContextMenuDirective, WrContextMenuItemComponent] })
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
      type: 'WrContextMenuComponent',
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
