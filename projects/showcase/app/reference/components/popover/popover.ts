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
    install: `import { WrPopover } from 'ngwr/popover';

@Component({ imports: [WrPopover] })
export class MyComponent {}`,
    basic: `<wr-btn [wrPopover]="info">Details</wr-btn>

<ng-template #info>
  <div style="padding: 1rem; max-width: 16rem">
    Anything you can render in a template.
  </div>
</ng-template>`,
    hover: `<wr-btn [wrPopover]="card" trigger="hover">Hover me</wr-btn>`,
    positions: `<wr-btn [wrPopover]="hint" position="right">Right</wr-btn>`,
    tooltip: `<!-- Pass a string + mode="tooltip" — opens on hover/focus,
     closes on blur/pointer-leave/Escape. Uses aria-describedby. -->
<wr-btn [wrPopover]="'Save changes'" mode="tooltip" position="top">Save</wr-btn>`,
    tooltipDelays: `<wr-btn
  [wrPopover]="'Slow to appear'"
  mode="tooltip"
  [showDelay]="500"
  [hideDelay]="100"
>
  Hover
</wr-btn>`,
  };

  protected readonly api = API.WrPopover;
}
