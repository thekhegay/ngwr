import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix, WrPasswordToggle } from 'ngwr/input';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-input-page',
  templateUrl: './input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrInput,
    WrInputGroup,
    WrInputPrefix,
    WrInputSuffix,
    WrPasswordToggle,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class InputComponent {
  protected readonly text = signal('Hello world');
  protected readonly amount = signal(0);
  protected readonly password = signal('');
  protected readonly phone = signal('');

  protected readonly snippets = {
    install: `import {
  WrInput,
  WrInputGroup,
  WrInputPrefix,
  WrInputSuffix,
  WrPasswordToggle,
} from 'ngwr/input';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [
    WrInput,
    WrInputGroup,
    WrInputPrefix,
    WrInputSuffix,
    WrPasswordToggle,
    FormsModule,
  ],
})
export class MyComponent {
  text = signal('');
}`,

    basic: `<input wrInput placeholder="Type here…" [(ngModel)]="text" />`,

    types: `<input wrInput type="email" placeholder="you@example.com" />
<input wrInput type="number" placeholder="0" />
<input wrInput type="search" placeholder="Search" />`,

    affixes: `<wr-input-group>
  <span wrInputPrefix>$</span>
  <input wrInput type="number" [(ngModel)]="amount" />
  <span wrInputSuffix>USD</span>
</wr-input-group>`,

    rounded: `<input wrInput rounded placeholder="Rounded" />`,

    password: `<wr-input-group>
  <input wrInput type="password" [(ngModel)]="password" #pwInput />
  <wr-password-toggle [for]="pwInput" />
</wr-input-group>`,

    mask: `<!-- Compatible with ngx-mask out of the box,
     because [wrInput] sits on the native <input>: -->
<input wrInput mask="(000) 000-0000" [(ngModel)]="phone" />`,

    disabled: `<input wrInput placeholder="Disabled" disabled />`,
  };

  protected readonly directiveApi: readonly DocApiRow[] = [
    {
      name: 'wrInput',
      description: 'Selector. Applies NGWR input styling to a native `<input>` or `<textarea>`.',
      type: 'attribute',
      default: '—',
    },
    { name: 'rounded', description: 'Pill-shaped corners.', type: 'boolean', default: 'false' },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    {
      name: 'wr-input-group',
      description: 'Wrapper for the input + prefix/suffix/toggle siblings.',
      type: 'component',
      default: '—',
    },
    { name: 'rounded', description: 'Pill-shaped corners.', type: 'boolean', default: 'false' },
  ];

  protected readonly affixApi: readonly DocApiRow[] = [
    { name: '[wrInputPrefix]', description: 'Marks an element as the left affix.', type: 'attribute', default: '—' },
    { name: '[wrInputSuffix]', description: 'Marks an element as the right affix.', type: 'attribute', default: '—' },
  ];

  protected readonly passwordToggleApi: readonly DocApiRow[] = [
    { name: 'for', description: 'The linked password `<input>` reference.', type: 'HTMLInputElement', required: true },
  ];
}
