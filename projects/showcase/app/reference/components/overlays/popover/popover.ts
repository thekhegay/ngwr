import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPopover } from 'ngwr/popover';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-popover-page',
  templateUrl: './popover.html',
  imports: [
    WrButton,
    WrPopover,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PopoverPageComponent {
  protected readonly snippets = {
    basic: `<wr-btn [wrPopover]="info">Details</wr-btn>

<ng-template #info>
  <div style="padding: 1rem; max-width: 16rem">
    Anything you can render in a template.
  </div>
</ng-template>`,
    hover: `<wr-btn [wrPopover]="card" trigger="hover">Hover me</wr-btn>`,
    positions: `<wr-btn [wrPopover]="hint" position="right">Right</wr-btn>`,
    tooltip: `<wr-btn [wrPopover]="'Save changes'" mode="tooltip" position="top">Save</wr-btn>`,
    origin: `@Component({
  imports: [WrPopover],
  template: \`
    <ul (mouseover)="point($event)">
      @for (file of files; track file.path) {
        <li [attr.data-path]="file.path">{{ file.name }}</li>
      }
    </ul>
    @if (shown(); as tip) {
      <span hidden [wrPopover]="tip.text" mode="tooltip" [wrPopoverOrigin]="tip.el"></span>
    }
  \`,
})
export class Files {
  protected readonly shown = signal<{ el: HTMLElement; text: string } | null>(null);

  // The tooltip then follows the item's own hover and focus. It names nothing:
  // aria-describedby stays on the host, so the item needs its own name.
  protected point(event: Event): void {
    const el = (event.target as Element).closest<HTMLElement>('li');
    if (el) this.shown.set({ el, text: el.dataset['path'] ?? '' });
  }
}`,
    tooltipDelays: `<wr-btn
  [wrPopover]="'Slow to appear'"
  mode="tooltip"
  [showDelay]="500"
  [hideDelay]="100"
>
  Hover
</wr-btn>`,
    scrollable: `import { CdkScrollable } from '@angular/cdk/scrolling';

@Component({
  imports: [CdkScrollable, WrPopover],
  template: \`
    <div class="side-panel" cdkScrollable>
      <wr-btn [wrPopover]="info">Details</wr-btn>
    </div>
  \`,
})
export class PanelComponent {}`,
    exportAs: `<wr-btn [wrPopover]="card" #details="wrPopover">Details</wr-btn>

<!-- From another control use open() and close(), not toggle(). -->
<wr-btn [disabled]="details.isOpen()" (click)="details.open()">Open</wr-btn>
<wr-btn [disabled]="!details.isOpen()" (click)="details.close()">Close</wr-btn>`,
  };

  protected readonly api = API.WrPopover;
}
