import { Component, signal } from '@angular/core';

import { WrButton, WrButtonGroup } from 'ngwr/button';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

type Align = 'left' | 'center' | 'right';

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
  protected readonly align = signal<Align>('left');

  protected readonly snippets = {
    install: `import { WrButtonGroup } from 'ngwr/button';

@Component({ imports: [WrButton, WrButtonGroup] })
export class MyComponent {}`,
    basic: `<wr-btn-group>
  <button wr-btn>Left</button>
  <button wr-btn>Middle</button>
  <button wr-btn>Right</button>
</wr-btn-group>`,
    colors: `<wr-btn-group>
  <button wr-btn color="primary">Save</button>
  <button wr-btn color="primary">Save & Continue</button>
</wr-btn-group>`,
    toggle: `<wr-btn-group>
  <button wr-btn [color]="align() === 'left' ? 'primary' : null" (click)="align.set('left')">Left</button>
  <button wr-btn [color]="align() === 'center' ? 'primary' : null" (click)="align.set('center')">Center</button>
  <button wr-btn [color]="align() === 'right' ? 'primary' : null" (click)="align.set('right')">Right</button>
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

  protected colorFor(value: Align): 'primary' | null {
    return this.align() === value ? 'primary' : null;
  }

  protected setAlign(value: Align): void {
    this.align.set(value);
  }
}
