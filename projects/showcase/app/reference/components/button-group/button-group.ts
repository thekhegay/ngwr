import { Component } from '@angular/core';

import { WrButton, WrButtonGroup } from 'ngwr/button';

import {
  DocApiComponent,
  type DocApiRow,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-button-group-page',
  templateUrl: './button-group.html',
  imports: [WrButton, WrButtonGroup, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
})
export default class ButtonGroupComponent {
  protected readonly snippets = {
    basic: `<wr-btn-group>
  <button wr-btn>Left</button>
  <button wr-btn>Middle</button>
  <button wr-btn>Right</button>
</wr-btn-group>`,
    colors: `<wr-btn-group>
  <button wr-btn color="primary">Save</button>
  <button wr-btn color="primary">Save & Continue</button>
</wr-btn-group>`,
    shape: `<wr-btn-group shape="rounded">
  <button wr-btn>One</button>
  <button wr-btn>Two</button>
  <button wr-btn>Three</button>
</wr-btn-group>

<wr-btn-group shape="pill">
  <button wr-btn>One</button>
  <button wr-btn>Two</button>
  <button wr-btn>Three</button>
</wr-btn-group>

<!-- Group shape wins over child [shape] -->
<wr-btn-group shape="pill">
  <button wr-btn>Forced</button>
  <button wr-btn shape="rounded">Pill anyway</button>
</wr-btn-group>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'shape',
      description:
        'Corner treatment for every child `<wr-btn>`. Inside a group the group ALWAYS wins and a child&rsquo;s own `[shape]` is ignored — including when this is `null`, which gives every child `rounded` rather than leaving it alone.',
      type: 'WrButtonShape | null',
      default: 'null',
    },
  ];
}
