import { JsonPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrAvatar } from 'ngwr/avatar';
import { WrButton } from 'ngwr/button';
import { WrFormError, WrFormField } from 'ngwr/form';
import { WrOption, WrOptionGroup, WrOptionLeading, type WrOptionLeadingPlacement, WrSelect } from 'ngwr/select';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-select-page',
  templateUrl: './select.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    JsonPipe,
    WrSelect,
    WrOption,
    WrOptionGroup,
    WrOptionLeading,
    WrAvatar,
    WrFormField,
    WrFormError,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SelectComponent {
  protected readonly size = signal<string | null>(null);
  protected readonly respSize = signal<string | null>(null);
  protected readonly framework = signal<string | null>('angular');
  protected readonly tags = signal<readonly string[]>(['typescript', 'angular']);
  /**
   * The tag demo's own model. It used to share `tags` with the multi demo,
   * which is backed by four `<wr-option>`s — nothing prunes a multi value
   * against the registry, so a tag typed here rendered as a chip up there via
   * the `displayWith` fallback, and removing a chip up there deleted it here.
   */
  protected readonly freeTags = signal<readonly string[]>(['ngwr', 'zoneless']);
  protected readonly manyTags = signal<readonly string[]>(['typescript', 'angular', 'rxjs', 'signals']);
  protected readonly recipients = signal<readonly string[]>(['ada@ngwr.dev']);

  /** Tag-mode validator demo: reasonable email check. */
  protected readonly isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /** Reactive-forms demo — `formControlName` on `<wr-select>`, no accessor in sight. */
  // Bound so the lint rule's unbound-method check stays satisfied.
  private readonly required = Validators.required.bind(Validators);
  protected readonly reactiveForm = new FormGroup({
    framework: new FormControl<string | null>(null, this.required),
  });

  protected submitReactive(): void {
    this.reactiveForm.markAllAsTouched();
  }

  protected readonly snippets = {
    install: `import { WrSelect, WrOption, WrOptionGroup } from 'ngwr/select';
import { FormsModule } from '@angular/forms';

// WrOptionGroup only if you use <wr-option-group>; FormsModule only for
// [(ngModel)]. For reactive forms bring ReactiveFormsModule instead — see
// "Use it in a form" below.
@Component({ imports: [WrSelect, WrOption, WrOptionGroup, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-select placeholder="Pick a size" [(value)]="size">
  <wr-option value="sm">Small</wr-option>
  <wr-option value="md">Medium</wr-option>
  <wr-option value="lg">Large</wr-option>
  <wr-option value="xl" disabled>Extra large — out of stock</wr-option>
</wr-select>`,
    groups: `<wr-select [(value)]="framework">
  <wr-option-group label="Frontend">
    <wr-option value="angular">Angular</wr-option>
    <wr-option value="react">React</wr-option>
    <wr-option value="vue">Vue</wr-option>
  </wr-option-group>
  <wr-option-group label="Backend">
    <wr-option value="nest">NestJS</wr-option>
    <wr-option value="fastify">Fastify</wr-option>
  </wr-option-group>
</wr-select>`,
    disabled: `<wr-select placeholder="Disabled" disabled />`,
    multi: `<!-- clearable is opt-in: without it the trigger has no clear-all (×). -->
<wr-select mode="multi" clearable placeholder="Pick tags" [(value)]="tags">
  <wr-option value="typescript">TypeScript</wr-option>
  <wr-option value="angular">Angular</wr-option>
  <wr-option value="rxjs">RxJS</wr-option>
  <wr-option value="signals">Signals</wr-option>
</wr-select>`,
    multiOverflow: `<wr-select mode="multi" [maxTagCount]="2" [maxItems]="6" [(value)]="manyTags">
  <wr-option value="typescript">TypeScript</wr-option>
  <wr-option value="angular">Angular</wr-option>
  <wr-option value="rxjs">RxJS</wr-option>
  <wr-option value="signals">Signals</wr-option>
  <wr-option value="cdk">CDK</wr-option>
  <wr-option value="ssr">SSR</wr-option>
</wr-select>`,
    tag: `<wr-select mode="tag" placeholder="Add a tag" [(value)]="tags" />

<!-- With separators + validator + caps -->
<wr-select
  mode="tag"
  placeholder="Add email and press Enter or ,"
  [(value)]="recipients"
  [separators]="['Enter', ',', ' ']"
  [validate]="isEmail"
  [maxItems]="5"
/>`,
    // The page said "reactive forms keep working through Angular's bridge" and
    // showed no example, next to a large claim that the library ships no
    // `ControlValueAccessor` — so the honest reading was that `formControlName`
    // would throw "No value accessor for form control". It does not: Angular 22
    // binds a signal-forms control directly, through `value` / `valueChange`.
    forms: `<!-- Signal forms — the native path. \`[formField]\` binds the field to
     the component's own \`value\` model. -->
<wr-select [formField]="form.framework">
  <wr-option value="angular">Angular</wr-option>
  <wr-option value="react">React</wr-option>
</wr-select>

<!-- Reactive forms — no ControlValueAccessor anywhere, and none needed.
     Angular 22 binds \`formControlName\` / \`[formControl]\` straight to the
     control's \`value\` model, relays its \`touch\` output as markAsTouched(),
     and writes \`disabled\` back down from the FormControl. -->
<form [formGroup]="form">
  <wr-form-field label="Framework" required>
    <wr-select formControlName="framework" placeholder="Pick one">
      <wr-option value="angular">Angular</wr-option>
      <wr-option value="react">React</wr-option>
    </wr-select>
    <wr-form-error key="required">Pick a framework.</wr-form-error>
  </wr-form-field>
</form>

<!-- Template-driven — the same bridge. -->
<wr-select [(ngModel)]="framework" name="framework">…</wr-select>`,
    formsTs: `import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { WrFormError, WrFormField } from 'ngwr/form';
import { WrOption, WrSelect } from 'ngwr/select';

@Component({
  imports: [ReactiveFormsModule, WrFormField, WrFormError, WrSelect, WrOption],
  templateUrl: './my.html',
})
export class MyComponent {
  protected readonly form = new FormGroup({
    framework: new FormControl<string | null>(null, Validators.required),
  });
}`,
    search: `<!-- clearable is opt-in: it paints the × and gates Backspace-to-clear. -->
<wr-select mode="search" clearable placeholder="Search a country" [(value)]="country">
  @for (c of countries; track c) {
    <wr-option [value]="c">{{ c }}</wr-option>
  }
</wr-select>`,
    leading: `<!-- The avatar is a TEMPLATE: nothing is created until the panel opens,
     and only the selected value / chips draw one while it is closed. -->
<wr-select placeholder="Assign to" [(value)]="assignee">
  @for (p of people; track p.id) {
    <wr-option [value]="p.id" [label]="p.name">
      <ng-template wrOptionLeading let-placement="placement">
        <wr-avatar shape="circle" [size]="avatarPx[placement]">{{ p.initials }}</wr-avatar>
      </ng-template>
      {{ p.name }} <small>{{ p.team }}</small>
    </wr-option>
  }
</wr-select>

<!-- Search: the visual sits before the field while the field shows the label,
     and steps aside while a query is on screen. Nothing else to wire. -->
<wr-select mode="search" clearable placeholder="Search people" [(value)]="reviewer">
  @for (p of people; track p.id) { … the same options … }
</wr-select>

<!-- Multi: every selected chip draws its option's visual. -->
<wr-select mode="multi" searchable clearable placeholder="Add assignees" [(value)]="assignees">
  @for (p of people; track p.id) { … the same options … }
</wr-select>

<!-- Rows the select draws itself ([options], [loader], virtualScroll) take a
     select-wide template — a direct child of <wr-select>. -->
<wr-select mode="search" virtualScroll [options]="people" [displayWith]="name">
  <ng-template wrOptionLeading let-person let-placement="placement">
    <wr-avatar shape="circle" [size]="avatarPx[placement]">{{ person.initials }}</wr-avatar>
  </ng-template>
</wr-select>`,
    leadingTs: `import { WrAvatar } from 'ngwr/avatar';
import { WrOption, WrOptionLeading, type WrOptionLeadingPlacement, WrSelect } from 'ngwr/select';

@Component({ imports: [WrSelect, WrOption, WrOptionLeading, WrAvatar] })
export class AssigneePicker {
  // One template, three surfaces — size it per placement.
  protected readonly avatarPx: Record<WrOptionLeadingPlacement, number> = { option: 24, value: 20, chip: 16 };
}`,
    searchableMulti: `<!-- searchable is orthogonal to mode — this is multi + typeahead. -->
<wr-select mode="multi" searchable placeholder="Filter categories" [(value)]="categories">
  @for (c of allCategories; track c) {
    <wr-option [value]="c">{{ c }}</wr-option>
  }
</wr-select>`,
    serverSearch: `<!-- Options live in the store; (searchChange) is the only wiring. -->
<wr-select
  mode="search"
  serverSearch
  placeholder="Search a country"
  [options]="results()"
  [loading]="pending()"
  [(value)]="picked"
  (searchChange)="onSearch($event)"
/>`,
    serverSearchTs: `// (searchChange) is debounced by [debounceMs] and fires on every settled
// change — including '' when the field is cleared, so the store can reset.
onSearch(query: string): void {
  this.store.dispatch(searchCountries({ query }));
}

// results()/pending() are plain store selectors.`,
    virtual: `<!-- 5,000 options via the [options] data array + virtualScroll:
     only ~one viewport of rows is ever in the DOM. -->
<wr-select
  mode="search"
  virtualScroll
  placeholder="Search 5,000 items"
  [options]="bigOptions"
  [(value)]="picked"
/>`,
    identity: `<!-- Bind the key, not the object. -->
<wr-select formControlName="categoryId" placeholder="Pick a category">
  @for (cat of categories(); track cat.id) {
    <wr-option [value]="cat.id">{{ cat.name }}</wr-option>
  }
</wr-select>`,
    identityTs: `// The option matches when \`option.value === select.value\`, nothing more.

// This never matches, and fails silently in both directions: the trigger shows
// the placeholder, the form value stays {id: 2, …} and the form stays valid.
const category = new FormControl<Category | null>(null);
category.setValue({ id: 2, name: 'Laptops' });

// This matches.
const categoryId = new FormControl<number | null>(null);
categoryId.setValue(2);`,
  };

  protected readonly countries = [
    'Australia',
    'Brazil',
    'Canada',
    'Denmark',
    'Estonia',
    'France',
    'Germany',
    'India',
    'Italy',
    'Japan',
    'Kazakhstan',
    'Mexico',
    'Netherlands',
    'Norway',
    'Poland',
    'Portugal',
    'Russia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Turkey',
    'United Kingdom',
    'United States',
    'Vietnam',
  ];

  protected readonly country = signal<string | null>(null);

  protected readonly allCategories = [
    'Excavators',
    'Loaders',
    'Cranes',
    'Dump trucks',
    'Graders',
    'Rollers',
    'Bulldozers',
    'Forklifts',
  ];

  protected readonly categories = signal<readonly string[]>(['Cranes']);

  // Assignee-picker demo — a leading avatar per person, kept out of the label.
  protected readonly people = [
    { id: 1, name: 'Ada Lovelace', initials: 'AL', team: 'Analysis' },
    { id: 2, name: 'Grace Hopper', initials: 'GH', team: 'Compilers' },
    { id: 3, name: 'Alan Turing', initials: 'AT', team: 'Research' },
    { id: 4, name: 'Katherine Johnson', initials: 'KJ', team: 'Flight' },
    { id: 5, name: 'Margaret Hamilton', initials: 'MH', team: 'Guidance' },
    { id: 6, name: 'Linus Torvalds', initials: 'LT', team: 'Kernel' },
  ];

  protected readonly assignee = signal<number | null>(2);
  protected readonly reviewer = signal<number | null>(4);
  protected readonly assignees = signal<readonly number[]>([1, 3, 5]);

  /** One template, three surfaces: a panel row, a trigger's selected value, a chip. */
  protected readonly avatarPx: Record<WrOptionLeadingPlacement, number> = { option: 24, value: 20, chip: 16 };

  // Server-side search demo. Stands in for "dispatch an action, read the
  // results back out of a store" — the (searchChange) output is the only wiring.
  protected readonly serverResults = signal<readonly string[]>([]);
  protected readonly serverPending = signal(false);
  protected readonly serverPicked = signal<string | null>(null);
  private serverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The fake request outlives navigation otherwise — it would write to signals
    // of a destroyed page.
    inject(DestroyRef).onDestroy(() => {
      if (this.serverTimer) clearTimeout(this.serverTimer);
    });
  }

  protected onServerSearch(query: string): void {
    if (this.serverTimer) clearTimeout(this.serverTimer);
    const q = query.trim().toLowerCase();
    if (!q) {
      this.serverResults.set([]);
      this.serverPending.set(false);
      return;
    }
    this.serverPending.set(true);
    this.serverTimer = setTimeout(() => {
      this.serverResults.set(this.countries.filter(c => c.toLowerCase().includes(q)));
      this.serverPending.set(false);
    }, 700);
  }

  // 5,000-item array for the virtual-scroll demo (search mode, [options] path).
  protected readonly bigOptions = Array.from({ length: 5000 }, (_, i) => `Item ${String(i + 1).padStart(4, '0')}`);
  protected readonly bigPick = signal<string | null>(null);

  protected readonly api = API.WrSelect;

  protected readonly outputsApi: readonly DocApiRow[] = [
    {
      name: '(searchChange)',
      description:
        "Debounced query, for server-side search. Fires on every settled change — including `''` when cleared, so a store can reset. `[minChars]` does not gate it.",
      type: 'string',
      default: '—',
    },
    {
      name: '(searchQueryChange)',
      description: 'Raw, undebounced query — the `[(searchQuery)]` half. Prefer `(searchChange)` for server calls.',
      type: 'string',
      default: '—',
    },
    {
      name: '(valueChange)',
      description: 'The `[(value)]` half. Bound automatically by `[formField]` / `[(ngModel)]`.',
      type: 'unknown',
      default: '—',
    },
    {
      name: '(touch)',
      description: 'Emitted on blur / commit so a bound field marks itself touched.',
      type: 'void',
      default: '—',
    },
  ];

  protected readonly optionApi: readonly DocApiRow[] = [
    { name: 'value', description: 'Form value contributed when chosen.', type: 'unknown', required: true },
    { name: 'disabled', description: 'Disable this option.', type: 'boolean', default: 'false' },
    {
      name: 'label',
      description:
        'What the select reports for this option — trigger, chip, chip remove label and search filter. Unset or empty, the option’s own text is used. The row’s accessible name stays the text it draws.',
      type: 'string | null',
      default: 'null',
    },
  ];

  protected readonly leadingApi: readonly DocApiRow[] = [
    {
      name: '[wrOptionLeading]',
      description:
        'On an `<ng-template>` inside a `<wr-option>` (that option’s visual) or as a direct child of `<wr-select>` (the default for every row, and the only way to reach `[options]`, `[loader]` and virtual rows).',
      type: 'TemplateRef<WrOptionLeadingContext>',
    },
    { name: '$implicit', description: 'The option’s value — `let-value`.', type: 'T' },
    {
      name: 'placement',
      description:
        "Where this copy is drawn: `'option'` (a panel row), `'chip'` (a multi chip) or `'value'` (the selected value on a single-mode trigger — beside the label on a button trigger, before the input on a search-shaped one).",
      type: "'option' | 'chip' | 'value'",
    },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    { name: 'label', description: 'Section heading.', type: 'string', required: true },
  ];
}
