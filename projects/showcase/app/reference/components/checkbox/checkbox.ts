import { Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

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
    ReactiveFormsModule,
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
    // No example existed for this, next to the library's loud "no
    // ControlValueAccessor anywhere" — which reads as "reactive forms are not
    // supported". They are: Angular 22 binds a signal-forms control directly.
    forms: `<!-- Signal forms — the native path. -->
<wr-checkbox [formField]="form.agree">I agree</wr-checkbox>

<!-- Reactive forms. A single <wr-checkbox> is a FormCheckboxControl, so the
     control it binds holds a BOOLEAN — the checkbox's \`checked\` model, not
     \`checkboxValue\` (which is group identity and stays out of forms). -->
<form [formGroup]="form">
  <wr-checkbox formControlName="agree">I agree to the terms</wr-checkbox>

  <!-- A <wr-checkbox-group> is a FormValueControl<unknown[]>, so ITS control
       holds the array of checked \`checkboxValue\`s. -->
  <wr-checkbox-group formControlName="features">
    <wr-checkbox checkboxValue="autosave">Autosave</wr-checkbox>
    <wr-checkbox checkboxValue="notifications">Notifications</wr-checkbox>
  </wr-checkbox-group>
</form>

<!-- Template-driven — the same bridge. -->
<wr-checkbox [(ngModel)]="agree" name="agree">I agree</wr-checkbox>`,
    formsTs: `import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { WrCheckbox, WrCheckboxGroup } from 'ngwr/checkbox';

@Component({
  imports: [ReactiveFormsModule, WrCheckbox, WrCheckboxGroup],
  templateUrl: './my.html',
})
export class MyComponent {
  protected readonly form = new FormGroup({
    agree: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    features: new FormControl<string[]>(['autosave'], { nonNullable: true }),
  });
}`,
    indeterminate: `<!-- A parent "select all": mixed when only some children are checked. -->
<wr-checkbox [checked]="allChecked()" (checkedChange)="toggleAll()" [indeterminate]="someChecked()">
  Select all
</wr-checkbox>
@for (p of permItems; track p) {
  <wr-checkbox [checked]="perms().includes(p)" (checkedChange)="togglePerm(p)">{{ p }}</wr-checkbox>
}`,
  };

  /** Reactive-forms demo — `formControlName` on the checkbox and on the group. */
  // Bound so the lint rule's unbound-method check stays satisfied.
  private readonly requiredTrue = Validators.requiredTrue.bind(Validators);
  protected readonly reactiveForm = new FormGroup({
    agree: new FormControl(false, { nonNullable: true, validators: [this.requiredTrue] }),
    features: new FormControl<string[]>(['autosave'], { nonNullable: true }),
  });

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
