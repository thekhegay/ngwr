import { Component } from '@angular/core';

import { WrCollapse, WrCollapseGroup } from 'ngwr/collapse';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-collapse-page',
  templateUrl: './collapse.html',
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
    install: `import { WrAccordion, WrCollapse, WrCollapseGroup } from 'ngwr/collapse';

// WrAccordion is <wr-accordion>, the accordion shorthand below — a separate
// class, so writing the tag without importing it renders nothing.
@Component({ imports: [WrCollapse, WrCollapseGroup, WrAccordion] })
export class MyComponent {}`,
    basic: `<wr-collapse title="Section title">
  Section body…
</wr-collapse>`,
    accordion: `<!-- Either form works. \`<wr-accordion>\` is the shorthand: it is
     \`<wr-collapse-group accordion>\` with the flag baked in. -->
<wr-accordion>
  <wr-collapse title="A">…</wr-collapse>
  <wr-collapse title="B">…</wr-collapse>
  <wr-collapse title="C">…</wr-collapse>
</wr-accordion>

<wr-collapse-group accordion>
  <wr-collapse title="A">…</wr-collapse>
  <wr-collapse title="B">…</wr-collapse>
</wr-collapse-group>`,
  };

  protected readonly api = API.WrCollapse;

  protected readonly groupApi: readonly DocApiRow[] = [
    {
      name: 'accordion',
      description: 'When true, opening one child closes the others.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
