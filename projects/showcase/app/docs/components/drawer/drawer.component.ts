import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import {
  WrDrawerCloseDirective,
  WrDrawerComponent,
  WrDrawerContentDirective,
  WrDrawerFooterDirective,
  WrDrawerTitleDirective,
} from 'ngwr/drawer';
import { WrSegmentedComponent, type WrSegmentedOption } from 'ngwr/segmented';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-drawer-page',
  templateUrl: './drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    WrSegmentedComponent,
    WrDrawerComponent,
    WrDrawerTitleDirective,
    WrDrawerContentDirective,
    WrDrawerFooterDirective,
    WrDrawerCloseDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DrawerPageComponent {
  protected readonly open = signal(false);
  protected readonly position = signal<'left' | 'right' | 'top' | 'bottom'>('right');

  protected readonly positionOptions: readonly WrSegmentedOption<'left' | 'right' | 'top' | 'bottom'>[] = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
  ];

  protected readonly snippets = {
    install: `import {
  WrDrawerComponent,
  WrDrawerTitleDirective,
  WrDrawerContentDirective,
  WrDrawerFooterDirective,
  WrDrawerCloseDirective,
} from 'ngwr/drawer';`,
    basic: `<wr-btn (click)="open.set(true)">Open</wr-btn>

<wr-drawer [(open)]="open" position="right" width="22rem">
  <h2 wrDrawerTitle>Settings</h2>
  <div wrDrawerContent>…</div>
  <div wrDrawerFooter>
    <wr-btn wrDrawerClose>Close</wr-btn>
    <wr-btn color="primary" wrDrawerClose>Save</wr-btn>
  </div>
</wr-drawer>`,
  };

  protected readonly drawerApi: readonly DocApiRow[] = [
    { name: 'open', description: 'Open state. Two-way bindable.', type: 'boolean', default: 'false' },
    {
      name: 'position',
      description: 'Side the drawer slides in from.',
      type: "'left' | 'right' | 'top' | 'bottom'",
      default: "'right'",
    },
    { name: 'width', description: 'Width when position is left/right.', type: 'string', default: "'20rem'" },
    { name: 'height', description: 'Height when position is top/bottom.', type: 'string', default: "'16rem'" },
    { name: 'hasBackdrop', description: 'Show the dimming backdrop.', type: 'boolean', default: 'true' },
    { name: 'closeOnBackdropClick', description: 'Close when backdrop is clicked.', type: 'boolean', default: 'true' },
    { name: 'closeOnEscape', description: 'Close on Escape.', type: 'boolean', default: 'true' },
  ];

  protected readonly directivesApi: readonly DocApiRow[] = [
    { name: '[wrDrawerTitle]', description: 'Styles the title row.', type: 'directive', default: '—' },
    { name: '[wrDrawerContent]', description: 'Styles the scrollable body.', type: 'directive', default: '—' },
    {
      name: '[wrDrawerFooter]',
      description: 'Styles the footer; align="start" | "center" | "end" (default end).',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrDrawerClose]',
      description: 'Closes the parent drawer on click.',
      type: 'directive',
      default: '—',
    },
  ];
}
