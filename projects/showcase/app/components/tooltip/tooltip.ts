import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTooltip } from 'ngwr/tooltip';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tooltip-page',
  templateUrl: './tooltip.html',
  imports: [
    WrButton,
    WrTooltip,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TooltipPageComponent {
  protected readonly snippets = {
    install: `import { WrTooltip } from 'ngwr/tooltip';

@Component({ imports: [WrTooltip] })
export class MyComponent {}`,
    basic: `<wr-btn [wrTooltip]="'Save changes'">Save</wr-btn>`,
    positions: `<wr-btn [wrTooltip]="'Above'"  position="top">Top</wr-btn>
<wr-btn [wrTooltip]="'Below'"  position="bottom">Bottom</wr-btn>
<wr-btn [wrTooltip]="'Left'"   position="left">Left</wr-btn>
<wr-btn [wrTooltip]="'Right'"  position="right">Right</wr-btn>`,
    delays: `<wr-btn [wrTooltip]="'Fast'" [showDelay]="0" [hideDelay]="0">Instant</wr-btn>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'wrTooltip', description: 'Tooltip text. Empty string disables.', type: 'string', required: true },
    { name: 'position', description: 'Anchor side.', type: "'top' | 'bottom' | 'left' | 'right'", default: "'top'" },
    { name: 'showDelay', description: 'Delay before showing (ms).', type: 'number', default: '300' },
    { name: 'hideDelay', description: 'Delay before hiding (ms).', type: 'number', default: '150' },
  ];
}
