import { Component, signal } from '@angular/core';
import { form, max, metadata, min, minLength, required, schema } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

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

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'team', label: 'Team' },
  { value: 'enterprise', label: 'Enterprise' },
];

@Component({
  selector: 'ngwr-schema-form-page',
  templateUrl: './schema-form.html',
  imports: [
    RouterLink,
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
      required(path.fullName);
      metadata(path.fullName, WR_FIELD, () => ({ kind: 'input', placeholder: 'Ada Lovelace' }));

      required(path.workEmail);
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

  protected readonly typeSnippet = `type WrFieldKind =
  | 'input' | 'textarea' | 'number' | 'select'
  | 'checkbox' | 'switch' | 'radio' | 'date' | 'slider';

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
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrFieldSpec',
      description: "One field's presentation, carried on the schema under `WR_FIELD`.",
      type: 'interface',
    },
    {
      name: 'kind',
      description:
        'Which control to draw. The one required member — and the one thing nothing can type-check against the field, so a `kind` that contradicts the value type warns in dev mode off the runtime value.',
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
      description: 'For `select` and `radio`. Ignored by every other kind.',
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
      description:
        'Granularity for `number` and `slider`. The BOUNDS are deliberately absent: Angular refuses a `[min]` or `[max]` binding on a `[formField]`-bound control (NG8022), so they live in the schema as `min(path.x, 18)`. `step` is presentation and has no schema function, so it stays here.',
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
  required(path.fullName);
  metadata(path.fullName, WR_FIELD, () => ({ kind: 'input', placeholder: 'Ada Lovelace' }));

  required(path.workEmail);
  metadata(path.workEmail, WR_FIELD, () => ({
    kind: 'input',
    type: 'email',
    label: 'Work email',
    hint: 'We only use it for the invoice.',
  }));

  metadata(path.role, WR_FIELD, () => ({ kind: 'select', label: 'Plan', options: PLANS }));
});`,

    template: `<wr-schema-form [field]="signup" [columns]="2" />`,

    reactive: `// The spec is a LogicFn, so it can read the rest of the form. An admin
// sees a longer list, and nothing in the template knows about it.
metadata(path.role, WR_FIELD, ctx => ({
  kind: 'select',
  options: ctx.stateOf(path.workEmail).value().endsWith('@acme.com') ? ALL_PLANS : PUBLIC_PLANS,
}));`,

    state: `// State lives in the schema, never in the spec.
required(path.workEmail);          // draws the * beside the label
disabled(path.seats, ({ valueOf }) => valueOf(path.role) === 'starter');
hidden(path.notes, ({ valueOf }) => !valueOf(path.agree));
min(path.seats, 1);
max(path.seats, 500);

// This does not compile — NG8022. The field owns the bound.
// <wr-input-number [formField]="f.seats" [min]="1" />`,

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
    {
      kind: 'Component',
      title: 'wr-form-field',
      url: ['/reference/components', 'form-field'],
      description:
        'What this component draws around every field. Reach for it directly when you write the markup yourself.',
    },
    {
      kind: 'Guide',
      title: 'Forms',
      url: ['/guides', 'forms'],
      description: 'How Signal Forms binds to ngwr controls, and which states reach a control on their own.',
    },
    {
      kind: 'Component',
      title: 'wr-select',
      url: ['/reference/components', 'select'],
      description:
        "What `kind: 'select'` renders — including the search and multi modes a hand-written field can ask for.",
    },
  ];
}
