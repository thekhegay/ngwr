import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDrawerClose, WrDrawer, WrDrawerContent, WrDrawerFooter, WrDrawerManager, WrDrawerTitle } from 'ngwr/drawer';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';

import { type ChatData, ChatDrawerComponent } from './chat-drawer';

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
  templateUrl: './drawer.html',
  imports: [
    WrButton,
    WrSegmented,
    WrDrawer,
    WrDrawerTitle,
    WrDrawerContent,
    WrDrawerFooter,
    WrDrawerClose,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DrawerPageComponent {
  private readonly drawers = inject(WrDrawerManager);

  protected readonly open = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly position = signal<'left' | 'right' | 'top' | 'bottom'>('right');
  protected readonly lastResult = signal<string>('—');

  protected readonly positionOptions: readonly WrSegmentedOption<'left' | 'right' | 'top' | 'bottom'>[] = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
  ];

  protected readonly snippets = {
    basic: `<wr-btn (click)="open.set(true)">Open</wr-btn>

<wr-drawer [(open)]="open" position="right" width="22rem">
  <h2 wrDrawerTitle>Settings</h2>
  <div wrDrawerContent>…</div>
  <div wrDrawerFooter>
    <wr-btn wrDrawerClose>Close</wr-btn>
    <wr-btn color="primary" wrDrawerClose>Save</wr-btn>
  </div>
</wr-drawer>`,
    nonModal: `<wr-drawer [(open)]="open" [hasBackdrop]="false" width="18rem">
  <h2 wrDrawerTitle>Details</h2>
  <div wrDrawerContent>…</div>
</wr-drawer>`,
    service: `import { WrDrawerManager } from 'ngwr/drawer';

export class Inbox {
  private readonly drawers = inject(WrDrawerManager);

  async openChat(threadId: string): Promise<void> {
    const ref = this.drawers.open<ChatComponent, string, ChatData>(ChatComponent, {
      data: { thread: threadId },
      position: 'right',
      width: '24rem',
    });

    const sent = await ref.awaitClose(); // string | undefined
  }
}`,
    serviceContent: `import { WR_DRAWER_DATA, WrDrawerRef } from 'ngwr/drawer';

@Component({...})
export class ChatComponent {
  protected readonly data = inject<ChatData>(WR_DRAWER_DATA);
  private readonly ref = inject<WrDrawerRef<ChatComponent, string>>(WrDrawerRef);

  send(): void {
    this.store.send(this.draft());
    this.ref.close('sent');
  }
}`,
    focus: `<wr-drawer [(open)]="open" position="right">
  <h2 wrDrawerTitle>Filters</h2>
  <div wrDrawerContent>
    <wr-form-field label="Search">
      <input wrInput cdkFocusInitial [value]="query()" (input)="onQuery($event)" />
    </wr-form-field>
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
    {
      name: 'hasBackdrop',
      description: 'Show the dimming backdrop and make the drawer modal. `false` gives a non-modal panel.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'closeOnBackdropClick', description: 'Close when backdrop is clicked.', type: 'boolean', default: 'true' },
    { name: 'closeOnEscape', description: 'Close on Escape.', type: 'boolean', default: 'true' },
    {
      name: 'closable',
      description: 'Show the built-in dismiss (×) in the top-right corner.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'closeLabel',
      description: 'Accessible name for the dismiss button. Falls back to the drawer.close catalog key.',
      type: 'string | null',
      default: 'null',
    },
  ];

  protected readonly serviceApi: readonly DocApiRow[] = [
    {
      name: 'open(component, options?)',
      description: 'Opens a component as a drawer. Returns a WrDrawerRef.',
      type: '(component, WrDrawerOptions) => WrDrawerRef',
      default: '—',
    },
  ];

  protected readonly optionsApi: readonly DocApiRow[] = [
    { name: 'data', description: 'Payload exposed to the content via WR_DRAWER_DATA.', type: 'D', default: '—' },
    {
      name: 'closeOnNavigation',
      description: 'Close the drawer when the router navigates.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'position',
      description: 'Side the drawer slides in from.',
      type: "'left' | 'right' | 'top' | 'bottom'",
      default: "'right'",
    },
    { name: 'width', description: 'Width when position is left/right.', type: 'string', default: "'20rem'" },
    { name: 'height', description: 'Height when position is top/bottom.', type: 'string', default: "'16rem'" },
    { name: 'maxHeight', description: 'Height cap for top/bottom positions.', type: 'string | null', default: 'null' },
    { name: 'rounded', description: 'Round the leading corners.', type: 'boolean', default: 'false' },
    {
      name: 'safeArea',
      description: 'Pad the trailing edge with the safe-area inset.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'hasBackdrop',
      description: 'Show the dimming backdrop and make the drawer modal. `false` gives a non-modal panel.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'closeOnBackdropClick', description: 'Close when backdrop is clicked.', type: 'boolean', default: 'true' },
    { name: 'closeOnEscape', description: 'Close on Escape.', type: 'boolean', default: 'true' },
    {
      name: 'closable',
      description: 'Show the built-in dismiss (×) in the top-right corner.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'panelClass',
      description: 'Extra class(es) on the panel.',
      type: 'WrClassInput',
      default: 'null',
    },
    {
      name: 'closeLabel',
      description: 'Accessible name for the dismiss button. Falls back to the drawer.close catalog key.',
      type: 'string',
      default: '—',
    },
    {
      name: 'panelClass',
      description: 'Extra class(es) on the box that slides in, not the CDK pane.',
      type: 'WrClassInput',
      default: '—',
    },
  ];

  protected readonly injectablesApi: readonly DocApiRow[] = [
    {
      name: 'WR_DRAWER_DATA',
      description: "The data payload passed to open(). undefined when you didn't pass any.",
      type: 'InjectionToken<D>',
      default: '—',
    },
    {
      name: 'WrDrawerRef',
      description: 'The open drawer’s own ref — call close(result) to dismiss it from the content.',
      type: 'WrDrawerRef<unknown, unknown>',
      default: '—',
    },
    {
      name: 'WR_DRAWER_REF',
      description: 'The same ref, used by `[wrDrawerClose]`. Prefer `inject(WrDrawerRef)`.',
      type: 'InjectionToken<WrDrawerRef<C, R>>',
      default: '—',
    },
  ];

  protected readonly directivesApi: readonly DocApiRow[] = [
    { name: '[wrDrawerTitle]', description: 'Styles the title row.', type: 'directive', default: '—' },
    { name: '[wrDrawerContent]', description: 'Styles the scrollable body.', type: 'directive', default: '—' },
    {
      name: '[wrDrawerFooter]',
      description: 'Styles the footer row.',
      type: 'directive',
      default: '—',
    },
    {
      name: 'align',
      description: 'Horizontal alignment of the footer content.',
      type: "'start' | 'center' | 'end'",
      default: "'end'",
      sub: true,
    },
    {
      name: '[wrDrawerClose]="value?"',
      description: 'Closes the drawer on click. The value is the close result of a service-opened drawer.',
      type: 'directive',
      default: '—',
    },
  ];

  protected async openChat(): Promise<void> {
    const ref = this.drawers.open<ChatDrawerComponent, string, ChatData>(ChatDrawerComponent, {
      data: { thread: 'Dispatch #4821' },
      position: 'right',
      width: '24rem',
    });
    const sent = await ref.awaitClose();
    this.lastResult.set(sent ? `Sent: ${sent}` : 'Cancelled');
  }
}
