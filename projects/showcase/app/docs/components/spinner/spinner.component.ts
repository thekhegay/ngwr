import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrSpinnerComponent } from 'ngwr/spinner';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-spinner-page',
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrSpinnerComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SpinnerComponent {
  protected readonly snippets = {
    install: `import { WrSpinnerComponent } from 'ngwr/spinner';

@Component({ imports: [WrSpinnerComponent] })
export class MyComponent {}`,
    basic: `<wr-spinner />`,
    sizes: `<wr-spinner size="sm" />
<wr-spinner size="md" />
<wr-spinner size="lg" />`,
    color: `<div style="color: var(--wr-color-primary)">
  <wr-spinner />
</div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'size', description: 'Size variant (em-based).', type: "'sm' | 'md' | 'lg'", default: "'md'" },
  ];
}
