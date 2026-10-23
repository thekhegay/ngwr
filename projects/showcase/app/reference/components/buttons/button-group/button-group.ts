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
  <button wr-btn type="button">Left</button>
  <button wr-btn type="button">Middle</button>
  <button wr-btn type="button">Right</button>
</wr-btn-group>`,
    colors: `<wr-btn-group>
  <button wr-btn type="button" color="primary">Save</button>
  <button wr-btn type="button" color="primary">Save & Continue</button>
</wr-btn-group>`,
    shape: `<wr-btn-group shape="rounded">
  <button wr-btn type="button">One</button>
  <button wr-btn type="button">Two</button>
  <button wr-btn type="button">Three</button>
</wr-btn-group>

<wr-btn-group shape="pill">
  <button wr-btn type="button">One</button>
  <button wr-btn type="button">Two</button>
  <button wr-btn type="button">Three</button>
</wr-btn-group>

<!-- Group shape wins over child [shape] -->
<wr-btn-group shape="pill">
  <button wr-btn type="button">Forced</button>
  <button wr-btn type="button" shape="rounded">Pill anyway</button>
</wr-btn-group>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'shape',
      description:
        "Corners of every child button. A child's own `shape` is ignored; `null` gives every child `rounded`.",
      type: 'WrButtonShape | null',
      default: 'null',
    },
  ];
}
