import { Component, computed, signal } from '@angular/core';
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
    indeterminate: `<!-- A parent "select all": mixed when only some children are checked. -->
<wr-checkbox [ngModel]="allChecked()" (ngModelChange)="toggleAll()" [indeterminate]="someChecked()">
  Select all
</wr-checkbox>
@for (p of permItems; track p) {
  <wr-checkbox [ngModel]="perms().includes(p)" (ngModelChange)="togglePerm(p)">{{ p }}</wr-checkbox>
}`,
  };

  protected readonly permItems = ['read', 'write', 'delete'] as const;
  protected readonly perms = signal<readonly string[]>(['read']);
  protected readonly allChecked = computed(() => this.perms().length === this.permItems.length);
  protected readonly someChecked = computed(() => this.perms().length > 0 && !this.allChecked());

  protected toggleAll(): void {
    this.perms.set(this.allChecked() ? [] : [...this.permItems]);
  }

  protected togglePerm(p: string): void {
    const s = this.perms();
    this.perms.set(s.includes(p) ? s.filter(x => x !== p) : [...s, p]);
  }

  protected readonly api: readonly DocApiRow[] = [
    { name: 'id', description: 'Stable id for the native input.', type: 'string', default: 'auto' },
    { name: 'value', description: 'Used only inside <wr-checkbox-group>.', type: 'unknown', default: 'null' },
    {
      name: 'size',
      description: 'Control size, shares the --wr-control-* contract.',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
    },
    {
      name: 'indeterminate',
      description: 'Show the mixed state (a dash) for a partly-checked "select all". Visual only, controlled.',
      type: 'boolean',
      default: 'false',
    },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    { name: '—', description: 'Provides itself via WR_CHECKBOX_GROUP to children.', type: '—', default: '—' },
  ];
}
