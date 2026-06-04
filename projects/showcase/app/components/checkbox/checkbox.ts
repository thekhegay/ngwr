import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCheckbox, WrCheckboxGroup } from 'ngwr/checkbox';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-checkbox-page',
  templateUrl: './checkbox.html',
  imports: [
    FormsModule,
    WrCheckbox,
    WrCheckboxGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CheckboxComponent {
  protected readonly agree = signal(true);
  protected readonly features = signal<string[]>(['autosave']);

  protected readonly snippets = {
    install: `import { WrCheckbox, WrCheckboxGroup } from 'ngwr/checkbox';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrCheckbox, WrCheckboxGroup, FormsModule] })
export class MyComponent {}`,
    standalone: `<wr-checkbox [(ngModel)]="agree">I agree</wr-checkbox>`,
    group: `<wr-checkbox-group [(ngModel)]="features">
  <wr-checkbox value="autosave">Autosave</wr-checkbox>
  <wr-checkbox value="notifications">Notifications</wr-checkbox>
  <wr-checkbox value="darkmode">Dark mode</wr-checkbox>
</wr-checkbox-group>`,
    disabled: `<wr-checkbox [disabled]="true">Disabled</wr-checkbox>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'id', description: 'Stable id for the native input.', type: 'string', default: 'auto' },
    { name: 'value', description: 'Used only inside <wr-checkbox-group>.', type: 'unknown', default: 'null' },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    { name: '—', description: 'Provides itself via WR_CHECKBOX_GROUP to children.', type: '—', default: '—' },
  ];
}
