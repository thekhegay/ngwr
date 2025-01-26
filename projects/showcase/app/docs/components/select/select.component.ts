import { NgForOf } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { WrAvatarComponent } from 'ngwr/avatar';
import { WrSelectComponent, WrSelectGroup, WrSelectOption } from 'ngwr/select';
import { WrOptionGroupComponent } from 'ngwr/select/select-option-group.component';
import { WrOptionComponent } from 'ngwr/select/select-option.component';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-select',
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    CodeComponent,
    SnippetComponent,
    WrOptionComponent,
    WrSelectComponent,
    FormsModule,
    WrOptionGroupComponent,
    WrTagComponent,
    NgForOf,
    WrAvatarComponent,
  ],
})
export class SelectComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly title = 'Select';
  protected readonly description = 'Basic select component used to choose one or multiple options from a list';

  protected readonly formControl = new FormControl({ value: 1, disabled: false });
  protected readonly disabledFormControl = new FormControl({ value: null, disabled: true });

  protected selectedValue: string | null = null;
  protected selectedUserValue: string | null = null;
  protected selectedValues: string[] = [];
  protected selectedGroupValue: string | null = null;
  protected selectedSearchValue: string | null = null;
  protected selectedMaxValues: string[] = [];
  protected selectedSearchMultipleValues: string[] = [];

  protected readonly code = {
    import: `import{WrSelectComponent,WrOptionComponent,WrOptionGroupComponent}from'ngwr/select';`,
    component: `@Component({\n  //...\n  imports: [\n    WrSelectComponent,\n    WrOptionComponent,\n    WrOptionGroupComponent\n  ],\n})\nexport class MyComponent {}`,
    basic: `<wr-select [(ngModel)]="values">\n  <wr-option value="1" label="Option 1"></wr-option>\n  <wr-option value="2" label="Option 2"></wr-option>\n</wr-select>`,
    basicFormControl: `<wr-select [formControl]="formControl"  [clearable]="true">\n  <wr-option value="1" label="Option 1"></wr-option>\n  <wr-option value="2" label="Option 2"></wr-option>\n</wr-select>`,
    multiple: `<wr-select [(ngModel)]="values" [multiple]="true">\n  <wr-option value="1" label="Option 1"></wr-option>\n  <wr-option value="2" label="Option 2"></wr-option>\n</wr-select>`,
    groups: `<wr-select [(ngModel)]="value">\n  <wr-option-group label="Group 1">\n    <wr-option value="1.1" label="Option 1.1"></wr-option>\n    <wr-option value="1.2" label="Option 1.2"></wr-option>\n  </wr-option-group>\n  <wr-option-group label="Group 2">\n    <wr-option value="2.1" label="Option 2.1"></wr-option>\n  </wr-option-group>\n</wr-select>`,
    disabled: `<wr-select [formControl]="disabledFormControl">\n  <wr-option value="1" label="Option 1"></wr-option>\n</wr-select>\n\n<wr-select disabled>\n  <wr-option value="1" label="Option 1"></wr-option>\n</wr-select>`,
    search: `<wr-select [(ngModel)]="value" [searchable]="true">\n  <wr-option value="1" label="Option 1"></wr-option>\n  <wr-option value="2" label="Option 2"></wr-option>\n</wr-select>`,
    searchMultiple: `<wr-select [(ngModel)]="values" [multiple]="true" [searchable]="true">\n  <wr-option value="1" label="Option 1"></wr-option>\n  <wr-option value="2" label="Option 2"></wr-option>\n  <wr-option value="3" label="Option 3"></wr-option>\n</wr-select>`,
    maxCount: `<wr-select [(ngModel)]="values" [multiple]="true" [maxMultipleCount]="2">\n  <wr-option value="1" label="Option 1"></wr-option>\n  <wr-option value="2" label="Option 2"></wr-option>\n  <wr-option value="3" label="Option 3"></wr-option>\n</wr-select>`,
    customOptionTemplate:
      `<wr-select [(ngModel)]="value">\n` +
      `  @for (user of users; track user.id) {\n` +
      `    <wr-option [value]="user.id" [label]="user.name">\n` +
      `      <ng-template let-option="option">\n` +
      `        <div class="custom-option">\n` +
      `          <img [src]="user.avatar" />\n` +
      `          <div class="custom-option__content">\n` +
      `            <div class="custom-option__title">{{ user.name }}</div>\n` +
      `            <div class="custom-option__subtitle">{{ user.position }}</div>\n` +
      `            @if (option.selectComponent.isSelected(option)) {\n` +
      `              <div class="custom-option__badge">Selected</div>\n` +
      `            }\n` +
      `          </div>\n` +
      `        </div>\n` +
      `      </ng-template>\n` +
      `    </wr-option>\n` +
      `  }\n` +
      `</wr-select>`,
    clearable:
      `<wr-select [(ngModel)]="selectedValues" [multiple]="true" [clearable]="true">\n` +
      `  <wr-option value="1" label="Option 1"></wr-option>\n` +
      `  <wr-option value="2" label="Option 2"></wr-option>\n` +
      `</wr-select>`,
    styling:
      `:root {\n` +
      `  /* Base select styles */\n` +
      `  --wr-select-color: var(--wr-color-dark);\n` +
      `  --wr-select-placeholder-color: var(--wr-color-light);\n` +
      `  --wr-select-bg-color: var(--wr-color-white);\n` +
      `  --wr-select-border-color: var(--wr-color-light-lighter);\n` +
      `  --wr-select-border-radius: 0.375rem;\n` +
      `  --wr-select-box-shadow: none;\n` +
      `  --wr-select-font-size: 0.875rem;\n` +
      `  --wr-select-font-weight: 400;\n` +
      `  --wr-select-line-height: 1.25rem;\n` +
      `  --wr-select-padding-y: 0.375rem;\n` +
      `  --wr-select-padding-x: 0.825rem;\n\n` +
      `  /* Dropdown styles */\n` +
      `  --wr-select-dropdown-bg: var(--wr-color-white);\n` +
      `  --wr-select-dropdown-border-color: var(--wr-color-light-lighter);\n` +
      `  --wr-select-dropdown-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n` +
      `  --wr-select-dropdown-max-height: 256px;\n\n` +
      `  /* Option styles */\n` +
      `  --wr-select-option-hover-bg: rgba(var(--wr-color-light-rgb), 0.2);\n` +
      `  --wr-select-option-selected-color: var(--wr-color-dark);\n` +
      `  --wr-select-option-selected-bg: rgba(var(--wr-color-primary-rgb), 0.1);\n` +
      `  --wr-select-option-disabled-color: var(--wr-color-medium);\n` +
      `  --wr-select-option-height: 32px;\n\n` +
      `  /* Group styles */\n` +
      `  --wr-select-group-label-color: var(--wr-color-medium);\n` +
      `  --wr-select-group-label-font-size: 0.75rem;\n\n` +
      `  /* Counter styles */\n` +
      `  --wr-select-counter-color: var(--wr-color-medium);\n` +
      `  --wr-select-counter-font-size: 0.775rem;\n\n` +
      `  /* Tag styles */\n` +
      `  --wr-select-tag-line-height: 0.8rem;\n` +
      `}\n`,
  };

  protected readonly options: WrSelectOption[] = [
    { value: 1, label: 'Option 1' },
    { value: 2, label: 'Option 2' },
    { value: 3, label: 'Option 3' },
  ];

  protected readonly groupedOptions: WrSelectGroup[] = [
    {
      label: 'Group 1',
      options: [
        { value: '1.1', label: 'Option 1.1' },
        { value: '1.2', label: 'Option 1.2' },
      ],
    },
    {
      label: 'Group 2',
      options: [{ value: '2.1', label: 'Option 2.1' }],
    },
  ];

  protected readonly users = [
    {
      id: 1,
      name: 'John Doe',
      position: 'Software Engineer',
    },
    {
      id: 2,
      name: 'Jane Smith',
      position: 'Product Manager',
    },
  ];

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Select');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['select', 'wr-select', 'dropdown', 'combobox']);
  }
}
