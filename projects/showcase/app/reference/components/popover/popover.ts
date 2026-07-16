import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPopover } from 'ngwr/popover';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

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

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrPopover',
      description: 'Content. `TemplateRef` in popover mode, plain string in tooltip mode.',
      type: 'TemplateRef | string',
      required: true,
    },
    {
      name: 'mode',
      description:
        '`popover` (default) for template content + click trigger, or `tooltip` for text content + hover/focus trigger.',
      type: "'popover' | 'tooltip'",
      default: "'popover'",
    },
    {
      name: 'trigger',
      description: 'Open trigger. Ignored in tooltip mode (always hover+focus).',
      type: "'click' | 'hover'",
      default: "'click'",
    },
    {
      name: 'position',
      description:
        'Anchor side, with optional `-start`/`-end` edge alignment. Defaults differ by mode (`bottom` for popover, `top` for tooltip).',
      type: "'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'",
      default: 'null',
    },
    {
      name: 'showDelay',
      description: 'Tooltip only — delay before showing, in ms.',
      type: 'number',
      default: '120',
    },
    {
      name: 'hideDelay',
      description: 'Tooltip only — delay before hiding, in ms.',
      type: 'number',
      default: '60',
    },
    { name: '(opened)', description: 'Fires after open.', type: 'EventEmitter<void>', default: '—' },
    { name: '(closed)', description: 'Fires after close.', type: 'EventEmitter<void>', default: '—' },
  ];
}
