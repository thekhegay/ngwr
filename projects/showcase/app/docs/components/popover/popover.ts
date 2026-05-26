import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'wrPopover', description: 'Content template.', type: 'TemplateRef', required: true },
    { name: 'trigger', description: 'Open trigger.', type: "'click' | 'hover'", default: "'click'" },
    {
      name: 'position',
      description: 'Anchor side.',
      type: "'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'",
      default: "'bottom'",
    },
    { name: '(opened)', description: 'Fires after open.', type: 'EventEmitter<void>', default: '—' },
    { name: '(closed)', description: 'Fires after close.', type: 'EventEmitter<void>', default: '—' },
  ];
}
