import { Component } from '@angular/core';

import { WrAccordion, WrCollapse, WrCollapseGroup } from 'ngwr/collapse';

import {
  DocApiComponent,
  type DocApiRow,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-collapse-page',
  templateUrl: './collapse.html',
  imports: [
    WrAccordion,
    WrCollapse,
    WrCollapseGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocApiComponent,
  ],
})
export default class CollapsePageComponent {
  protected readonly snippets = {
    basic: `<wr-collapse title="Section title">
  Section body…
</wr-collapse>`,
    flat: `<wr-collapse title="Can I cancel?" [bordered]="false">…</wr-collapse>
<wr-collapse title="Is there a trial?" [bordered]="false">…</wr-collapse>`,
    plus: `<wr-collapse title="Can I cancel?" indicator="plus">…</wr-collapse>
<wr-collapse title="Is there a trial?" indicator="plus">…</wr-collapse>`,
    heading: `<wr-accordion headingLevel="3">
  <wr-collapse title="Profile">…</wr-collapse>
  <wr-collapse title="Security" headingLevel="4">…</wr-collapse>
</wr-accordion>`,
    accordion: `<wr-accordion>
  <wr-collapse title="A">…</wr-collapse>
  <wr-collapse title="B">…</wr-collapse>
  <wr-collapse title="C">…</wr-collapse>
</wr-accordion>

<!-- Same as -->
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
    {
      name: 'headingLevel',
      description:
        'Heading level (1 to 6) for a child header when the child sets none. Also an input of `wr-accordion`.',
      type: '1 | 2 | 3 | 4 | 5 | 6 | null',
      default: 'null',
    },
  ];
}
