import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInputComponent } from 'ngwr/input';

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
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrInputComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class InputComponent {
  protected readonly text = signal('Hello world');
  protected readonly password = signal('');

  protected readonly snippets = {
    install: `import { WrInputComponent } from 'ngwr/input';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrInputComponent, FormsModule] })
export class MyComponent {
  text = signal('');
}`,
    basic: `<wr-input placeholder="Type here…" [(ngModel)]="text" />`,
    types: `<wr-input type="email" placeholder="you@example.com" />
<wr-input type="number" placeholder="0" />
<wr-input type="search" placeholder="Search" />`,
    affixes: `<wr-input prefix="$" suffix="USD" type="number" />`,
    rounded: `<wr-input placeholder="Rounded" rounded />`,
    password: `<wr-input type="password" placeholder="Password" passwordToggle />`,
    disabled: `<wr-input placeholder="Disabled" [disabled]="true" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'type', description: 'Native input type.', type: 'WrInputType', default: "'text'" },
    { name: 'placeholder', description: 'Placeholder text.', type: 'string', default: "''" },
    { name: 'prefix', description: 'Static text before the value.', type: 'string | null', default: 'null' },
    { name: 'suffix', description: 'Static text after the value.', type: 'string | null', default: 'null' },
    { name: 'rounded', description: 'Pill-shaped corners.', type: 'boolean', default: 'false' },
    { name: 'readonly', description: 'Read-only state.', type: 'boolean', default: 'false' },
    {
      name: 'passwordToggle',
      description: 'Show an eye toggle for password fields.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
