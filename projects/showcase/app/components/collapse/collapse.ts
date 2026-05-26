import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrCollapse, WrCollapseGroup } from 'ngwr/collapse';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-collapse-page',
  templateUrl: './collapse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrCollapse,
    WrCollapseGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CollapsePageComponent {
  protected readonly snippets = {
    install: `import { WrCollapse, WrCollapseGroup } from 'ngwr/collapse';

@Component({ imports: [WrCollapse, WrCollapseGroup] })
export class MyComponent {}`,
    basic: `<wr-collapse title="Section title">
  Section body…
</wr-collapse>`,
    accordion: `<wr-collapse-group accordion>
  <wr-collapse title="A">…</wr-collapse>
  <wr-collapse title="B">…</wr-collapse>
  <wr-collapse title="C">…</wr-collapse>
</wr-collapse-group>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'title', description: 'Header text.', type: 'string', required: true },
    { name: 'open', description: 'Open state. Two-way bindable.', type: 'boolean', default: 'false' },
    { name: 'disabled', description: 'Disable the header.', type: 'boolean', default: 'false' },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    {
      name: 'accordion',
      description: 'When true, opening one child closes the others.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
