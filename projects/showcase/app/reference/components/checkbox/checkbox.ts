import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCheckbox, WrCheckboxGroup } from 'ngwr/checkbox';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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
    standalone: `<!-- signal-forms native: [(checked)], [formField], or classic [(ngModel)] -->
<wr-checkbox [(checked)]="agree">I agree</wr-checkbox>`,
    group: `<wr-checkbox-group [(value)]="features">
  <wr-checkbox checkboxValue="autosave">Autosave</wr-checkbox>
  <wr-checkbox checkboxValue="notifications">Notifications</wr-checkbox>
  <wr-checkbox checkboxValue="darkmode">Dark mode</wr-checkbox>
</wr-checkbox-group>`,
    disabled: `<wr-checkbox [disabled]="true">Disabled</wr-checkbox>`,
    indeterminate: `<!-- A parent "select all": mixed when only some children are checked. -->
<wr-checkbox [checked]="allChecked()" (checkedChange)="toggleAll()" [indeterminate]="someChecked()">
  Select all
</wr-checkbox>
@for (p of permItems; track p) {
  <wr-checkbox [checked]="perms().includes(p)" (checkedChange)="togglePerm(p)">{{ p }}</wr-checkbox>
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

  protected readonly api = API.WrCheckbox;

  protected readonly groupApi = API.WrCheckboxGroup;
}
