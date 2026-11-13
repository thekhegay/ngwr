import { Component, signal } from '@angular/core';
import {
  applyEach,
  form,
  hidden,
  max,
  maxLength,
  metadata,
  min,
  minLength,
  required,
  schema,
} from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WR_FIELD } from 'ngwr/form';
import { WrSchemaForm } from 'ngwr/schema-form';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

interface Signup {
  readonly fullName: string;
  readonly workEmail: string;
  readonly role: string;
  readonly seats: number;
  readonly startsOn: Date | null;
  readonly notes: string;
  readonly agree: boolean;
  readonly internalRef: string;
}

interface Address {
  readonly street: string;
  readonly city: string;
}

interface Employee {
  readonly fullName: string;
  readonly workEmail: string;
  readonly roles: readonly string[];
  readonly contractor: boolean;
  readonly agency: string;
  readonly addresses: readonly Address[];
  readonly attachments: readonly File[];
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'billing', label: 'Billing' },
  { value: 'support', label: 'Support' },
];

const ACCOUNT = { title: 'Account', description: 'Who signs in, and what they may do.', columns: 2 };

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'team', label: 'Team' },
  { value: 'enterprise', label: 'Enterprise' },
];

@Component({
  selector: 'ngwr-schema-form-page',
  templateUrl: './schema-form.html',
  imports: [
    WrButton,
    WrSchemaForm,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class SchemaFormPage {
  private readonly model = signal<Signup>({
    fullName: '',
    workEmail: '',
    role: 'team',
    seats: 3,
    startsOn: null,
    notes: '',
    agree: false,
    internalRef: 'ref-8812',
  });

  protected readonly signup = form(
    this.model,
    schema<Signup>(path => {
      required(path.fullName, { message: 'Enter your name.' });
      metadata(path.fullName, WR_FIELD, () => ({ kind: 'input', placeholder: 'Ada Lovelace' }));

      required(path.workEmail, { message: 'Enter a work email for the invoice.' });
      metadata(path.workEmail, WR_FIELD, () => ({
        kind: 'input',
        type: 'email',
        label: 'Work email',
        hint: 'We only use it for the invoice.',
      }));

      metadata(path.role, WR_FIELD, () => ({ kind: 'select', label: 'Plan', options: PLANS }));

      min(path.seats, 1);
      max(path.seats, 500);
      metadata(path.seats, WR_FIELD, () => ({ kind: 'number' }));

      metadata(path.startsOn, WR_FIELD, () => ({ kind: 'date', label: 'Starts on' }));

      minLength(path.notes, 10);
      metadata(path.notes, WR_FIELD, () => ({
        kind: 'textarea',
        span: 2,
        placeholder: 'Anything we should know before the kickoff?',
      }));

      metadata(path.agree, WR_FIELD, () => ({
        kind: 'checkbox',
        label: 'I agree to the terms of service',
        span: 2,
      }));

      // `internalRef` carries no WR_FIELD, so the form does not draw it.
    })
  );

  protected submit(): void {
    this.signup().markAsTouched();
  }

  private readonly employeeModel = signal<Employee>({
    fullName: 'Ada Lovelace',
    workEmail: 'ada@example.com',
    roles: ['admin'],
    contractor: false,
    agency: '',
    addresses: [{ street: '12 St James Square', city: 'London' }],
    attachments: [],
  });

  protected readonly employee = form(
    this.employeeModel,
    schema<Employee>(path => {
      required(path.fullName, { message: 'Enter a name.' });
      metadata(path.fullName, WR_FIELD, () => ({ kind: 'input', section: ACCOUNT }));
      metadata(path.workEmail, WR_FIELD, () => ({ kind: 'input', type: 'email', section: 'Account' }));
      required(path.roles, { message: 'Pick at least one role.' });
      metadata(path.roles, WR_FIELD, () => ({
        kind: 'multiselect',
        options: ROLES,
        placeholder: 'Pick roles',
        section: 'Account',
        span: 2,
      }));

      metadata(path.contractor, WR_FIELD, () => ({ kind: 'switch', section: 'Employment' }));
      required(path.agency, { message: 'Name the agency.' });
      hidden(path.agency, ({ valueOf }) => !valueOf(path.contractor));
      metadata(path.agency, WR_FIELD, () => ({ kind: 'input', section: 'Employment' }));

      minLength(path.addresses, 1, { message: 'Keep at least one address.' });
      maxLength(path.addresses, 3);
      metadata(path.addresses, WR_FIELD, () => ({
        kind: 'array',
        itemLabel: 'Address',
        hint: 'One to three.',
        columns: 2,
        span: 2,
        item: (): Address => ({ street: '', city: '' }),
      }));
      applyEach(path.addresses, item => {
        required(item.street, { message: 'Enter the street.' });
        metadata(item.street, WR_FIELD, () => ({ kind: 'input' }));
        metadata(item.city, WR_FIELD, () => ({ kind: 'input' }));
      });

      metadata(path.attachments, WR_FIELD, () => ({
        kind: 'file',
        multiple: true,
        accept: '.pdf,image/*',
        span: 2,
      }));
    })
  );

  protected save(): void {
    this.employee().markAsTouched();
  }

  protected readonly kinds = [
    { kind: 'input', control: '<input wrInput>', value: 'string' },
    { kind: 'textarea', control: '<wr-textarea>', value: 'string' },
    { kind: 'number', control: '<wr-input-number>', value: 'number | null' },
    { kind: 'select', control: '<wr-select>', value: 'T | null' },
    { kind: 'multiselect', control: '<wr-select mode="multi">', value: 'T[]' },
    { kind: 'tags', control: '<wr-select mode="tag">', value: 'string[]' },
    { kind: 'checkbox', control: '<wr-checkbox>', value: 'boolean' },
    { kind: 'switch', control: '<wr-switch>', value: 'boolean' },
    { kind: 'radio', control: '<wr-radio-group>', value: 'T | null' },
    { kind: 'segmented', control: '<wr-segmented>', value: 'T | null' },
    { kind: 'date', control: '<wr-date-picker>', value: 'Date | null' },
    { kind: 'daterange', control: '<wr-date-range-picker>', value: 'WrDateRange | null' },
    { kind: 'slider', control: '<wr-slider>', value: 'number' },
    { kind: 'rating', control: '<wr-rating>', value: 'number | null' },
    { kind: 'file', control: '<wr-file-upload>', value: 'File | null, or File[] with multiple' },
    { kind: 'array', control: 'one <wr-schema-form> per item', value: 'object[]' },
  ] as const;

  protected readonly typeSnippet = `type WrFieldKind =
  | 'input' | 'textarea' | 'number' | 'select' | 'multiselect' | 'tags'
  | 'checkbox' | 'switch' | 'radio' | 'segmented' | 'date' | 'daterange'
  | 'slider' | 'rating' | 'file' | 'array';

interface WrFieldOption {
  value: unknown;
  label: string;
  disabled?: boolean;
}

interface WrFieldSpec {
  kind: WrFieldKind;
  label?: string;
  placeholder?: string;
  hint?: string;
  options?: readonly WrFieldOption[];
  type?: string;
  step?: number;
  span?: number;
  section?: string | WrFieldSection;
  multiple?: boolean;
  accept?: string;
  item?: () => unknown;
  itemLabel?: string;
  columns?: number;
}

interface WrFieldSection {
  title: string;
  description?: string;
  columns?: number;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrFieldSpec',
      description: "One field's presentation, carried on the schema under `WR_FIELD`.",
      type: 'interface',
    },
    {
      name: 'kind',
      description: 'Which control to draw. Dev mode warns when it does not fit the value type.',
      type: 'WrFieldKind',
      sub: true,
    },
    {
      name: 'label',
      description: "Defaults to the field's key, de-camel-cased — `workEmail` becomes “Work email”.",
      type: 'string',
      default: 'the key',
      sub: true,
    },
    { name: 'placeholder', description: 'Passed through to the control.', type: 'string', default: '—', sub: true },
    {
      name: 'hint',
      description: 'Help text under the control. An error replaces it while the field is invalid.',
      type: 'string',
      default: '—',
      sub: true,
    },
    {
      name: 'options',
      description: 'For `select`, `multiselect`, `radio` and `segmented`. Ignored by every other kind.',
      type: 'readonly WrFieldOption[]',
      default: '—',
      sub: true,
    },
    {
      name: 'type',
      description: "Native `type` for `kind: 'input'` — `email`, `password`, `url`, `tel`.",
      type: 'string',
      default: "'text'",
      sub: true,
    },
    {
      name: 'step',
      description: 'Granularity for `number` and `slider`. Set the bounds in the schema: `min(path.x, 18)`.',
      type: 'number',
      default: '1',
      sub: true,
    },
    {
      name: 'span',
      description: "Columns this field spans in the grid, clamped to the form's own `columns`.",
      type: 'number',
      default: '1',
      sub: true,
    },
    {
      name: 'section',
      description: 'The section the field is drawn in: a title, or a `WrFieldSection`.',
      type: 'string | WrFieldSection',
      default: '—',
      sub: true,
    },
    {
      name: 'multiple',
      description: 'For `file`: accept several files, so the field holds `File[]`.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    { name: 'accept', description: 'For `file`: the native `accept` list.', type: 'string', default: '—', sub: true },
    {
      name: 'item',
      description: 'For `array`: the value a new item starts as. Without it there is no Add button.',
      type: '() => unknown',
      default: '—',
      sub: true,
    },
    {
      name: 'itemLabel',
      description: 'For `array`: what one item is called, numbered in its heading: “Address 2”.',
      type: 'string',
      default: 'the label',
      sub: true,
    },
    {
      name: 'columns',
      description: 'For `array`: grid columns inside each item.',
      type: 'number',
      default: '1',
      sub: true,
    },
    {
      name: 'WrFieldSection',
      description:
        'A titled `<fieldset>`: `{ title, description?, columns? }`. The first field to state a member sets it. `columns` defaults to the form’s own.',
      type: 'interface',
    },
    {
      name: 'WrFieldOption',
      description: 'One choice, for the kinds that offer a list: `{ value, label, disabled? }`.',
      type: 'interface',
    },
  ];

  protected readonly api = API.WrSchemaForm;

  protected readonly snippets = {
    basic: `import { form, metadata, required, schema } from '@angular/forms/signals';
import { WR_FIELD } from 'ngwr/form';

interface Signup {
  fullName: string;
  workEmail: string;
  role: string;
}

const signupSchema = schema<Signup>(path => {
  required(path.fullName, { message: 'Enter your name.' });
  metadata(path.fullName, WR_FIELD, () => ({ kind: 'input', placeholder: 'Ada Lovelace' }));

  required(path.workEmail, { message: 'Enter a work email for the invoice.' });
  metadata(path.workEmail, WR_FIELD, () => ({
    kind: 'input',
    type: 'email',
    label: 'Work email',
    hint: 'We only use it for the invoice.',
  }));

  metadata(path.role, WR_FIELD, () => ({ kind: 'select', label: 'Plan', options: PLANS }));
});`,

    template: `<wr-schema-form [field]="signup" [columns]="2" />`,

    backOffice: `const ACCOUNT = { title: 'Account', description: 'Who signs in, and what they may do.', columns: 2 };

const employeeSchema = schema<Employee>(path => {
  required(path.fullName, { message: 'Enter a name.' });
  metadata(path.fullName, WR_FIELD, () => ({ kind: 'input', section: ACCOUNT }));
  metadata(path.workEmail, WR_FIELD, () => ({ kind: 'input', type: 'email', section: 'Account' }));
  required(path.roles, { message: 'Pick at least one role.' });
  metadata(path.roles, WR_FIELD, () => ({ kind: 'multiselect', options: ROLES, section: 'Account', span: 2 }));

  metadata(path.contractor, WR_FIELD, () => ({ kind: 'switch', section: 'Employment' }));
  required(path.agency, { message: 'Name the agency.' });
  hidden(path.agency, ({ valueOf }) => !valueOf(path.contractor));
  metadata(path.agency, WR_FIELD, () => ({ kind: 'input', section: 'Employment' }));

  minLength(path.addresses, 1, { message: 'Keep at least one address.' });
  maxLength(path.addresses, 3);
  metadata(path.addresses, WR_FIELD, () => ({
    kind: 'array',
    itemLabel: 'Address',
    columns: 2,
    span: 2,
    item: () => ({ street: '', city: '' }),
  }));
  applyEach(path.addresses, item => {
    required(item.street, { message: 'Enter the street.' });
    metadata(item.street, WR_FIELD, () => ({ kind: 'input' }));
    metadata(item.city, WR_FIELD, () => ({ kind: 'input' }));
  });

  metadata(path.attachments, WR_FIELD, () => ({ kind: 'file', multiple: true, accept: '.pdf,image/*', span: 2 }));
});

// <wr-schema-form [field]="employee" [columns]="2" addLabel="Add address" />`,

    sections: `// The first field states the section; the rest name its title.
metadata(path.fullName, WR_FIELD, () => ({
  kind: 'input',
  section: { title: 'Account', description: 'Who signs in.', columns: 2 },
}));
metadata(path.workEmail, WR_FIELD, () => ({ kind: 'input', section: 'Account' }));`,

    array: `minLength(path.addresses, 1, { message: 'Keep at least one address.' });
maxLength(path.addresses, 3);
metadata(path.addresses, WR_FIELD, () => ({
  kind: 'array',
  itemLabel: 'Address',
  columns: 2,
  item: () => ({ street: '', city: '' }),
}));

// The item's own fields and rules, once for every item.
applyEach(path.addresses, item => {
  required(item.street, { message: 'Enter the street.' });
  metadata(item.street, WR_FIELD, () => ({ kind: 'input' }));
  metadata(item.city, WR_FIELD, () => ({ kind: 'input' }));
});`,

    conditional: `// Drawn, and required, only for a contractor.
required(path.agency, { message: 'Name the agency.' });
hidden(path.agency, ({ valueOf }) => !valueOf(path.contractor));
metadata(path.agency, WR_FIELD, () => ({ kind: 'input' }));

// Inside applyEach the rule reads the item it belongs to.
applyEach(path.addresses, item => {
  hidden(item.vatId, ({ valueOf }) => !valueOf(item.business));
});`,
    layout: `metadata(path.notes, WR_FIELD, () => ({ kind: 'textarea', label: 'Notes', span: 2 }));

// notes fills the row; in one column its span is clamped to 1.
<wr-schema-form [field]="signup" [columns]="2" />
<wr-schema-form [field]="signup" [columns]="1" />`,

    reactive: `// acme.com addresses see every plan.
metadata(path.role, WR_FIELD, ctx => ({
  kind: 'select',
  options: ctx.stateOf(path.workEmail).value().endsWith('@acme.com') ? ALL_PLANS : PUBLIC_PLANS,
}));`,

    state: `required(path.workEmail); // draws the * beside the label
disabled(path.seats, ({ valueOf }) => valueOf(path.role) === 'starter');
hidden(path.notes, ({ valueOf }) => !valueOf(path.agree));
min(path.seats, 1);
max(path.seats, 500);

// Does not compile (NG8022): <wr-input-number [formField]="f.seats" [min]="1" />`,

    group: `<!-- \`address\` is a group: the parent draws none of it. -->
<wr-schema-form [field]="signup" [columns]="2" />

<h3>Address</h3>
<wr-schema-form [field]="signup.address" [columns]="2" />`,

    escape: `<!-- Draw most of the form, then write the one field by hand. -->
<wr-schema-form [field]="signup.address" [columns]="2" />

<wr-form-field label="Signature">
  <wr-color-picker [formField]="signup.brandColor" />
</wr-form-field>`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Component', title: 'wr-form-field', url: ['/reference/components', 'form-field'] },
    { kind: 'Guide', title: 'Forms', url: ['/guides', 'forms'] },
    { kind: 'Component', title: 'wr-select', url: ['/reference/components', 'select'] },
  ];
}
