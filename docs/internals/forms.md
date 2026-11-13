# Forms

Part of [AGENTS.md](../../AGENTS.md). Read this before changing a value control, Signal Forms, `wr-schema-form` or validation copy.

**Forms.** Value components are **Signal Forms-native** — twenty-two public
controls implement `FormValueControl` or `FormCheckboxControl`, so
`[formField]="form.x"` binds straight to the component's `value` / `checked`
model. A count and not "each", deliberately: `[wrColorPickerTrigger]` is public,
carries its own `value` model and implements neither, because it is a trigger
that drives a `wr-color-picker` which does. Re-derive with
`grep -rn "export class .* implements .*Form\(Value\|Checkbox\)Control" projects/lib --include='*.ts' | grep -v spec`
and subtract the internal `date-picker/internal/time-panel.ts` (without
`export class` the grep also counts the JSDoc lines that name the interface). `ControlValueAccessor` is
**gone from the library** — never add one. Classic `[(ngModel)]`, `[formControl]`
and `formControlName` still bind, but **no accessor is created**: `NgModel`,
`FormControlDirective` and `FormControlName` drive the control's `value` or
`checked` model directly. Core finds that model BY NAME — an input plus its
`…Change` output (`initializeCustomControlStatus` in `@angular/core`) — so a
control whose model is called anything else gets `NG01203` from all three. The
bridge has limits no ngwr code can lift, and the first is the dangerous one:
**template validator directives are not applied.** `required`, `minlength`,
`maxlength`, `pattern` and `email` written on an ngwr control match their
directives, but only the accessor path calls `setUpValidators`, so the
`FormControl` never sees them — no error, no `ng-invalid`, and the form submits.
Validators have to live on the `FormControl` (`min` / `max` never even match:
their selectors require `input[type=number]`). The bridge also ignores
`updateOn`, and a write with `{ emitEvent: false }` schedules no repaint, so
one from an HTTP callback or a timer needs `markForCheck()`. `checkbox/classic-forms-bridge.spec.ts` pins the drop as
Angular's current behaviour — reported upstream as
[angular/angular#70721](https://github.com/angular/angular/issues/70721), which reproduces it without ngwr,
so when that closes the pinned cases flip and every doc naming the limit moves with them;
`/guides/forms` is the consumer-facing account.
Standalone use is the two-way model, e.g. `[(value)]` / `[(checked)]`.
New value controls: implement `FormValueControl`, expose `value` as a `model()`,
plus a `touch` output, a `disabled` input and a **`readonly` input** — Angular
writes every name in `CONTROL_BINDING_NAMES` onto the control through
`setInputOnDirectives`, so a control that declares no `readonly` input simply
never hears about `readonly()` in the schema, with no warning anywhere. Never
delegate it to `disabled`: read-only keeps the tab stop, keeps announcing the
value and still submits, so the guard goes on the write path and the cue is a
`wr-<x>--readonly` class with `cursor: default`. Mirror it into ARIA **only where
the role allows it** — `aria-readonly` is not a global attribute, so it is legal
on `checkbox` / `switch` / `radiogroup` / `combobox` / `slider` / `textbox` and
illegal on `radio`, `tree`, `group` and `button`; where there is nothing valid to
mirror onto, say so in the input's JSDoc rather than reaching for `aria-disabled`,
which means something else. The field's error state is one call —
`useFormFieldAria()` from `ngwr/form` returns the `aria-invalid` /
`aria-describedby` pair off `WR_FORM_FIELD`. A COMPOSITE (`wr-transfer`,
`wr-color-picker`) whose own parts are ngwr controls must shield its subtree with
`providers: [{ provide: WR_FORM_FIELD, useValue: null }]` and read the real field
with `useFormFieldAria({ skipSelf: true })`, or its inner segmented strip and
checkboxes each announce the outer field's error as their own.

**A form can be DRAWN from its schema.** `WR_FIELD` (a `createMetadataKey` in
`ngwr/form`) carries a field's presentation — `kind`, label, hint, placeholder,
options, `step`, grid `span` — on the SAME schema as its rules, and
`<wr-schema-form [field]="f" [columns]="2">` from `ngwr/schema-form` walks the
field tree and draws each described field inside a `<wr-form-field>`. Three
things decide its shape and are worth knowing before extending it. **A field
with no `WR_FIELD` is skipped**, silently: a schema may describe more than one
screen renders, and inferring a control from a field's type would draw a switch
for every boolean flag in a model — it is also the escape hatch, since the
undescribed fields are the ones you write by hand beside it. **`required`,
`disabled`, `readonly`, `hidden`, `min` and `max` are NOT in `WrFieldSpec`**,
and for the last two that is not a preference: Angular refuses a `[min]` or
`[max]` binding on a `[formField]`-bound control (NG8022), so the bounds can
only live in the schema. `hidden()` is the one state the component acts on
itself, because Angular's docs say a template has to. And **the entry point is
its own** rather than part of `ngwr/form`: drawing nine kinds means depending on
nine controls, and `ngwr/form` is what every form imports for
`<wr-form-field>` alone. The one thing nothing else can catch is a `kind` that
contradicts the field's type — TypeScript cannot hold a metadata string against
it — so the component warns in dev mode off the runtime value, and says nothing
while that value is still empty.

**ngwr ships no validation copy.** For an error no projected
`<wr-form-error key>` claims, `<wr-form-field>` renders the error's own
`message` (Signal Forms rules take `{ message }`), else `validation.<key>` from
the APP's i18n catalog with the error payload as params — the key after
`normalizeError` folds Signal Forms' `minLength` / `maxLength` onto
`minlength` / `maxlength`. With neither it renders nothing for that key, and dev
mode warns once per field and key, naming the three ways to supply copy. v15
removed `provideWrFormErrors()`, `WR_FORM_ERRORS`, the English
`WR_FORM_ERROR_FALLBACKS` and every catalog's `validation` namespace, and the
date picker's refusals read `validation.dateFormat` / `minDate` / `maxDate` /
`dateFilter` from the app's catalog with no default either. Do not add a
sentence back anywhere in the library: a validator or a control reports a key
and a payload, and the words are the app's. The showcase supplies its own in
`projects/showcase/app/app.validation.ts`, the way a consumer would.
