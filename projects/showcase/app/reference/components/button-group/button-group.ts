import { Component } from '@angular/core';

import { WrButton, WrButtonGroup } from 'ngwr/button';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-button-group-page',
  templateUrl: './button-group.html',
  imports: [
    WrButton,
    WrButtonGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
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
        'Enforced corner treatment for every child `<wr-btn>`. Child `[shape]` is ignored when set on the group. `null` (default) leaves children alone.',
      type: "'rounded' | 'pill' | null",
      default: 'null',
    },
  ];
}
