/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type AfterContentChecked,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  contentChild,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  isDevMode,
  signal,
  untracked,
} from '@angular/core';
import { AbstractControl, NgControl, type ValidationErrors } from '@angular/forms';

import { EMPTY, type Subscription } from 'rxjs';

import { WrI18n, useI18nText } from 'ngwr/i18n';

import { WR_FORM_FIELD, type WrFormFieldContext } from './tokens';

let uid = 0;

/**
 * Error keys already reported on the server. Every prerendered route and every
 * request builds its fields afresh, so the per-field memo alone would repeat one
 * warning per page; the browser keeps it per field, where it names the field the
 * developer is looking at.
 */
const warnedOnServer = new Set<string>();

/** Validator payloads are plain objects; anything else interpolates nothing. */
function toParams(error: unknown): Record<string, unknown> | undefined {
  return error && typeof error === 'object' ? (error as Record<string, unknown>) : undefined;
}

/**
 * The sentence the validator carries itself, or `null`.
 *
 * Signal Forms validators take `{ message }` and keep it on the error object, and
 * the interop `NgControl` this field reads lists that object AS IS under its
 * `kind` (`signalErrorsToValidationErrors` in `@angular/forms`), so the message
 * arrives here untouched. A custom control's parse errors take the same road in
 * both forms flavours, which is how a `wr-date-picker` refusal is read. A classic
 * validator's payload has no `message` unless the app put one there.
 */
function ownMessage(error: unknown): string | null {
  const message = toParams(error)?.['message'];
  return typeof message === 'string' && message.trim() !== '' ? message : null;
}

/**
 * The two Signal Forms kinds whose spelling and payload differ from the classic
 * validator that means the same thing.
 *
 * Reactive forms emit `minlength` / `maxlength` carrying `requiredLength`;
 * Signal Forms emit `minLength` / `maxLength` carrying `minLength` / `maxLength`.
 * Restated before the catalog lookup so one `validation.minlength` entry in an
 * app's catalog answers both spellings, with `{{requiredLength}}` filled either
 * way — the message is the SAME message, one sentence about a length reached by
 * two spellings of one rule, and asking every app for two keys would only get
 * one of them written.
 */
const SIGNAL_FORMS_ALIASES: Readonly<Record<string, { readonly key: string; readonly from: string }>> = {
  minLength: { key: 'minlength', from: 'minLength' },
  maxLength: { key: 'maxlength', from: 'maxLength' },
};

/**
 * A Signal Forms length error, restated in the classic shape the catalog lookup
 * reads. Anything else passes through untouched.
 */
function normalizeError(key: string, error: unknown): { readonly key: string; readonly error: unknown } {
  const alias = SIGNAL_FORMS_ALIASES[key];
  if (!alias) return { key, error };

  const params = toParams(error);
  const bound = params?.[alias.from];
  return {
    key: alias.key,
    error: bound === undefined ? error : { ...params, requiredLength: bound },
  };
}

/**
 * One error message tied to a validator key. Renders only when the parent
 * form-field has a matching error in `control.errors`, and only once the
 * control is touched or dirty.
 *
 * A keyed message CLAIMS its key: the field renders no automatic message for it,
 * so per-field markup wins over the validator's own `message` and over the app's
 * `validation.*` catalog.
 *
 * @example
 * ```html
 * <wr-form-error key="required">This field is required.</wr-form-error>
 * <wr-form-error key="email">That doesn't look right.</wr-form-error>
 * ```
 */
@Component({
  selector: 'wr-form-error',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-form-error wr-form-field__error',
    role: 'alert',
    '[attr.data-key]': 'key() ?? null',
    '[class.wr-form-field__error--hidden]': '!visible()',
  },
})
export class WrFormError {
  /**
   * Validator key this message corresponds to (e.g. `'required'`).
   * Optional — without a key the message always renders, which is the
   * plain inline-error usage inside `<wr-form-item>`.
   */
  readonly key = input<string>();

  private readonly field = inject(WR_FORM_FIELD, { optional: true });

  /**
   * Whether this message is the one the current error calls for.
   *
   * The parent projects every `<wr-form-error>` through a single
   * `<ng-content select>`, which cannot filter — so each message decides for
   * itself. Without this, one invalid control rendered "Email is required."
   * and "That isn't a valid email." side by side, which is what the docs have
   * always described as gated behaviour.
   *
   * A keyless message always shows: that is the plain inline-error usage inside
   * `<wr-form-item>`, which has no error discovery at all.
   */
  protected readonly visible = computed(() => {
    const key = this.key();
    if (!key || !this.field) return true;
    return this.field.errorKeys().includes(key);
  });
}

/**
 * Wraps a label + control + hint + error messages into a single block —
 * the layout primitive every form ends up reinventing.
 *
 * - Auto-binds `label[for]` to the projected control via a generated id
 *   (or use the form-control's `[id]` if you set one).
 * - Reads the projected control's `NgControl` to surface validation
 *   errors only when the control has been touched / submitted.
 * - Optional `[required]` / `[optional]` markers next to the label.
 *
 * **ngwr ships no error texts.** Each error shows the first copy that exists for
 * it: a projected `<wr-form-error key>`, then the validator's own `message`
 * (`required(path.email, { message: 'Enter your email.' })`), then
 * `validation.<key>` in the app's i18n catalog, interpolated with the error's
 * payload. A key none of them answers renders nothing, and dev mode says so once.
 *
 * @example
 * ```html
 * <wr-form-field label="Email" hint="We'll never share it.">
 *   <input wrInput [formControl]="email" type="email" />
 *   <wr-form-error key="required">Email is required.</wr-form-error>
 *   <wr-form-error key="email">Not a valid email.</wr-form-error>
 * </wr-form-field>
 * ```
 *
 * @see https://ngwr.dev/reference/components/form-field
 */
@Component({
  selector: 'wr-form-field',
  templateUrl: './form-field.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: WR_FORM_FIELD,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrFormField),
    },
  ],
})
export class WrFormField implements WrFormFieldContext, AfterContentChecked {
  /** Label text shown above the control. */
  readonly label = input<string>('');

  /** Hint text shown below the control. Hidden when an error is visible. */
  readonly hint = input<string>('');

  /** Show a `*` next to the label. @default false */
  readonly required = input(false, { transform: coerceBooleanProperty });

  /**
   * Show an "optional" marker next to the label — the word comes from
   * `optionalLabel`. Mutually exclusive with `required`. @default false
   */
  readonly optional = input(false, { transform: coerceBooleanProperty });

  /**
   * Word inside the optional marker's parentheses. Falls back to
   * `form.optional`, then `'optional'`. The parentheses are the template's, so
   * no locale has to repeat punctuation.
   */
  readonly optionalLabel = input<string | null>(null);

  // Unlike the `*` marker beside it, this one is NOT `aria-hidden` — it sits
  // inside the `<label>` and is read as part of the control's accessible name,
  // so an English word here reached a Russian screen reader.
  protected readonly resolvedOptional = useI18nText(this.optionalLabel, 'form.optional', 'optional');

  /**
   * Force a specific id on the label's `for` attribute. Auto-generated
   * otherwise, and adopted by the projected `wrInput` unless that element
   * already carries an `id` of its own.
   */
  readonly controlId = input<string>(`wr-form-field-${++uid}`);

  // What a projected control reported it actually kept. `null` until one does — most
  // controls simply adopt `controlId`, and only a control with its own `id` overrides
  // it from the other direction.
  private readonly adoptedId = signal<string | null>(null);

  /**
   * Id the `<label for>` renders. A control that came with its own `id` keeps it, so
   * the label follows that instead of the generated one — otherwise `for` points at
   * an element that is not in the document and the field is unlabelled.
   */
  protected readonly labelFor = computed(() => this.adoptedId() ?? this.controlId());

  /** @internal `WrFormFieldContext` — see the token's docs. */
  adoptControlId(id: string): void {
    this.adoptedId.set(id);
  }

  /**
   * Projected `NgControl` — used to read touched / dirty / errors.
   *
   * This catches `[formField]` too: Angular's Signal Forms directive provides
   * `NgControl` via its interop shim, so both forms flavours land here.
   */
  protected readonly ngControl = contentChild(NgControl);

  /**
   * Bumped on every event the projected control emits.
   *
   * `AbstractControl`'s `touched` / `dirty` / `errors` accessors are NOT
   * reactive under classic forms — Angular reads them inside `untracked()`, and
   * `errors` is a plain assigned field. A `computed` over them therefore caches
   * its first value and never recomputes, which in a zoneless app means the
   * error block never appears at all. `control.events` is the reactive source
   * Angular does expose, so the computed depends on this counter instead.
   * Signal Forms needs none of this — its interop getters read live signals —
   * and harmlessly contributes no events.
   *
   * Events are not the whole story, which is what {@link ngAfterContentChecked} is for.
   */
  private readonly revision = signal(0);

  /** What the last check saw on a reactive control — see {@link ngAfterContentChecked}. */
  private seen: {
    readonly errors: ValidationErrors | null;
    readonly touched: boolean;
    readonly dirty: boolean;
  } | null = null;

  /**
   * Catch the changes a reactive control makes WITHOUT an event.
   *
   * `updateValueAndValidity({ emitEvent: false })`, `markAsTouched({ emitEvent: false })`
   * and their siblings change `errors`, `touched` and `dirty` and emit nothing, so the
   * subscription above never hears them and the message stays whatever it was. That is
   * not only an app's own silent write: Angular reports a custom control's PARSE errors
   * to a `FormControl` exactly that way — a validator re-run with `emitEvent: false` —
   * so a `wr-date-picker` refusing typed text made its control invalid while the field
   * went on showing the message from before, or nothing — and a later pass of change
   * detection did not help, because the message was memoised on a revision only events
   * move.
   *
   * This runs whenever the view holding the field is checked, which is when the page
   * around the control changes — for the date picker, the moment its refusal turns
   * visible. It is `ngAfterContentChecked` and not `ngDoCheck` for an ordering reason
   * read out of Angular's `refreshView`: check hooks run BEFORE the view's effects, and
   * Angular's parse-error validator is re-run from an effect in that same view, so a
   * `DoCheck` saw the errors one pass late and lost the message whenever nothing
   * refreshed the view again. Content-checked hooks run after those effects and before
   * the field's own bindings. Only a change moves the revision.
   *
   * Signal Forms' interop control is skipped: it is reactive already, and its `errors`
   * getter builds a fresh object on every read, which a reference check would call a
   * change on every pass — and re-resolve every message with it.
   */
  ngAfterContentChecked(): void {
    const control = this.ngControl()?.control;
    if (!(control instanceof AbstractControl)) {
      this.seen = null;
      return;
    }
    const { errors, touched, dirty } = control;
    const seen = this.seen;
    if (seen?.errors === errors && seen.touched === touched && seen.dirty === dirty) return;
    this.seen = { errors, touched, dirty };
    // The first sighting is only the baseline: `errors` reads `ngControl()`, so the
    // message already recomputed when the control appeared.
    if (seen) this.revision.update(n => n + 1);
  }

  constructor() {
    let sub: Subscription | null = null;
    effect(() => {
      const control = this.ngControl()?.control;
      sub?.unsubscribe();
      sub = (control?.events ?? EMPTY).subscribe(() => this.revision.update(n => n + 1));
    });
    inject(DestroyRef).onDestroy(() => sub?.unsubscribe());
  }

  protected readonly errors = computed(() => {
    this.revision();
    const c = this.ngControl();
    if (!c) return null;
    if (!c.touched && !c.dirty) return null;
    return c.errors;
  });

  protected readonly hasError = computed(() => {
    const errs = this.errors();
    return !!errs && Object.keys(errs).length > 0;
  });

  /** @internal Read by the projected `<wr-form-error>` children to decide which of them renders. */
  readonly errorKeys = computed<readonly string[]>(() => Object.keys(this.errors() ?? {}));

  /** @internal Read by the projected control so a screen reader is pointed at the message. */
  readonly describedBy = computed(() => (this.hasError() ? `${this.controlId()}-errors` : null));

  /**
   * @internal Read by the projected control so the hint is announced with the field.
   *
   * The hint used to carry no id at all, so the only thing `aria-describedby`
   * could ever name was the error block: the sentence explaining what to type was
   * on screen and reached a screen-reader user through no path whatsoever, and
   * the one gate that could have said so does not exist — axe has no rule that
   * visible help text must be programmatically associated.
   *
   * `null` while an error is showing, because the template swaps the hint out for
   * the message; publishing the id anyway would point every control at an element
   * that had just left the document.
   */
  readonly hintId = computed(() => (!this.hasError() && this.hint() ? `${this.controlId()}-hint` : null));

  /** @internal `WrFormFieldContext` — the id a role-based control points `aria-labelledby` at. */
  readonly labelId = computed(() => (this.label() ? `${this.controlId()}-label` : null));

  /**
   * Render a message for any error the markup does not already answer: the
   * validator's own `message`, else `validation.<key>` from the app's i18n
   * catalog. ngwr ships no error texts, so a key neither of them answers renders
   * nothing, and dev mode warns once for it.
   *
   * On by default: a field with no `<wr-form-error>` at all is the common case.
   * Turn it off for a field whose copy is entirely hand-written. @default true
   */
  readonly autoErrors = input(true, { transform: coerceBooleanProperty });

  private readonly projectedErrors = contentChildren(WrFormError);
  private readonly i18n = inject(WrI18n, { optional: true });
  private readonly isServer = !isPlatformBrowser(inject(PLATFORM_ID));

  /** Error keys this field has already warned about — see {@link warnNoCopy}. */
  private readonly warned = new Set<string>();

  /**
   * Errors with no projected `<wr-form-error key>` to answer them, resolved to
   * text. Per-field markup always wins — it is the most specific thing the author
   * wrote — and a key nothing answers is left out rather than rendered empty.
   */
  protected readonly autoMessages = computed<readonly { key: string; text: string }[]>(() => {
    if (!this.autoErrors()) return [];
    const errors = this.errors();
    if (!errors) return [];

    const claimed = new Set(
      this.projectedErrors()
        .map(e => e.key())
        .filter(Boolean)
    );

    const messages: { key: string; text: string }[] = [];
    for (const [key, error] of Object.entries(errors)) {
      if (claimed.has(key)) continue;
      const text = this.resolve(key, error);
      if (text) messages.push({ key, text });
      else if (isDevMode()) untracked(() => this.warnNoCopy(key));
    }
    return messages;
  });

  private resolve(rawKey: string, rawError: unknown): string | null {
    const own = ownMessage(rawError);
    if (own) return own;

    // `t()` reads the service's revision signal, so this recomputes on a locale
    // switch and when a loader-backed catalog lands; a miss returns the key itself.
    // ngwr's own catalogs carry no `validation` namespace, so only the app answers.
    const { key, error } = normalizeError(rawKey, rawError);
    const translated = this.i18n?.t(`validation.${key}`, toParams(error));
    return translated && translated !== `validation.${key}` ? translated : null;
  }

  /**
   * Say once, in dev, that an error is showing with nothing to read.
   *
   * Nothing on screen gives it away: the field still goes red and the control is
   * still marked invalid, so an empty error block survives review. With no
   * built-in copy that is the ordinary state of a validator nobody wrote words
   * for, not an edge case. Once per field and key — and once per key on the
   * server, where every prerendered page builds its fields again. The catalog key
   * is the normalised one, the markup key the one the control reported, because
   * those are what each of the two reads.
   */
  private warnNoCopy(rawKey: string): void {
    if (this.warned.has(rawKey)) return;
    this.warned.add(rawKey);
    if (this.isServer) {
      if (warnedOnServer.has(rawKey)) return;
      warnedOnServer.add(rawKey);
    }

    const catalogKey = normalizeError(rawKey, undefined).key;
    const field = this.label() ? `"${this.label()}"` : `#${this.labelFor()}`;
    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] <wr-form-field> ${field}: the "${rawKey}" error has no copy, so nothing is shown for it — ` +
        `ngwr ships no error texts. Supply one: { message } on the validator, "validation.${catalogKey}" ` +
        `in the app's i18n catalog, or <wr-form-error key="${rawKey}"> inside the field.`
    );
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-form-field'];
    if (this.hasError()) parts.push('wr-form-field--invalid');
    if (this.required()) parts.push('wr-form-field--required');
    return parts.join(' ');
  });
}
