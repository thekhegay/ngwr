import { Component } from '@angular/core';

import { WrSpinner } from 'ngwr/spinner';

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
  templateUrl: './spinner.html',
  imports: [WrSpinner, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class SpinnerComponent {
  protected readonly snippets = {
    install: `import { WrSpinner } from 'ngwr/spinner';

@Component({ imports: [WrSpinner] })
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
