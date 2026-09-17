/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Injectable,
  type ModelSignal,
  type Provider,
  type Signal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { transformedValue } from '@angular/forms/signals';

import { WrDateAdapter } from 'ngwr/date';
import { WR_FORM_FIELD, type WrFormFieldContext } from 'ngwr/form';
import { useI18nFormatter } from 'ngwr/i18n';

import type { WrDateInputError } from '../interfaces';

/** Per-picker live-region ids — see {@link WrDateInputField.statusId}. */
let statusUid = 0;

/** The constraints a typed date is held to — the same three the calendar disables days by. */
export interface WrDateInputBounds {
  readonly min: Date | null | undefined;
  readonly max: Date | null | undefined;
  readonly filter: ((date: Date) => boolean) | null;
}

/** Builds each kind of {@link WrDateInputError}, with its sentence already resolved. */
export interface WrDateInputRefusals {
  /** The text does not read as a date in `format`. */
  unreadable(format: string): WrDateInputError;
  /** Why `date` would be refused by `bounds`, or `null` when it would not be. */
  outOfBounds(date: Date, bounds: WrDateInputBounds): WrDateInputError | null;
}

/**
 * The refusals both pickers raise, from one place — the calendar, the single
 * picker and the range picker have to agree on what "refused" means, and the
 * message has to be the one `<wr-form-field>` would show for the same key.
 *
 * Must be called from an injection context.
 *
 * @internal
 */
export function useDateInputRefusals(): WrDateInputRefusals {
  const adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  // The same keys and the same English as `WR_FORM_ERROR_FALLBACKS`: the message a
  // picker announces on its own and the one a surrounding field renders are one
  // sentence, whichever of the two ends up saying it.
  const formatText = useI18nFormatter('validation.dateFormat', 'Expected format: {{example}}');
  const minText = useI18nFormatter('validation.minDate', 'Choose a later date.');
  const maxText = useI18nFormatter('validation.maxDate', 'Choose an earlier date.');
  const filterText = useI18nFormatter('validation.dateFilter', 'This date is not available.');

  return {
    unreadable(format) {
      // The 31st of December, at 18:45: a day past 12 cannot be mistaken for a month,
      // so the example shows the ORDER of the fields as well as their separators —
      // which is the whole question for someone typing `07.09.1994` into a field
      // that reads `9/7/1994`. The year is the current one so it never looks stale.
      const reference = adapter.setTime(adapter.createDate(adapter.getYear(adapter.today()), 11, 31), 18, 45, 0);
      const example = adapter.format(reference, format);
      return { kind: 'dateFormat', example, message: formatText({ example }) };
    },
    outOfBounds(date, { min, max, filter }) {
      if (min && adapter.compareDate(date, min) < 0) return { kind: 'minDate', date, min, message: minText() };
      if (max && adapter.compareDate(date, max) > 0) return { kind: 'maxDate', date, max, message: maxText() };
      if (filter && !filter(date)) return { kind: 'dateFilter', date, message: filterText() };
      return null;
    },
  };
}

/**
 * Hands the picker's refusals to the form it is bound to, so a refused entry makes
 * the FORM invalid rather than only the field's border.
 *
 * Angular's `transformedValue` is the public way a custom control reports parse
 * errors: bound with `[formField]` they join the field's errors, and bound with
 * `[formControl]`, `formControlName` or `[(ngModel)]` they become a validator on
 * the control. It is used here for that channel ONLY. The picker keeps its own text
 * model — the echo guard, and the range picker's per-end ordering, are older and
 * pinned — so `parse` never returns a `value`, which Angular documents as leaving the
 * model untouched.
 *
 * The returned function reports the picker's WHOLE current list, every time. The form
 * hears it from the keystroke — the picker's own wait for Enter or blur is about what
 * it shows, and a form whose validity lagged the text in its field could submit the old
 * value under text nobody meant.
 *
 * Angular's copy does not simply hold what was reported. It is a `linkedSignal` over the
 * model, so ANY model write clears it, and a form reset clears it without a model write
 * at all:
 *
 * - a write of the picker's own is followed by a report of its own, synchronously — the
 *   range picker committing one end while the other still holds refused text is the
 *   case that needs it;
 * - a write from outside replaces the text a refusal was about, and the picker reports
 *   its emptied list;
 * - what is left is a reset (`FormControl.reset()`, a Signal Forms field's `reset()`):
 *   the raw signal moved while the model did not. Angular has thrown the error away, and
 *   `onReset` is where the picker throws away the text it was about.
 *
 * Unbound, nothing resets it and it costs a signal and an effect.
 *
 * Must be called from an injection context.
 *
 * @internal
 */
export function useFormParseErrors<T>(
  value: ModelSignal<T>,
  onReset: () => void
): (errors: readonly WrDateInputError[]) => void {
  const channel = transformedValue<T, readonly WrDateInputError[]>(value, {
    parse: errors => ({ error: errors.length ? errors : undefined }),
    format: () => [],
  });

  /** What the raw signal held after the last report, and the model it was reported against. */
  let held: readonly WrDateInputError[] = untracked(channel);
  let against: T = untracked(value);

  const report = (errors: readonly WrDateInputError[]): void => {
    channel.set(errors);
    held = untracked(channel);
    against = untracked(value);
  };

  effect(() => {
    const now = channel();
    untracked(() => {
      if (now === held) return;
      held = now;
      if (Object.is(value(), against)) onReset();
      against = value();
    });
  });

  return report;
}

/**
 * What a picker's own text input sees as its `<wr-form-field>`: the real field, with
 * the refusal on show added to it. Provided per picker, and handed to the input
 * through `viewProviders`.
 *
 * `wrInput` writes `aria-invalid` and `aria-describedby` from the field it injects, and
 * a second binding on either attribute leaves it holding whichever wrote last — so
 * the picker cannot bind them beside `wrInput` while a field is there. It stands
 * between the two instead. The input then reads ONE state: invalid when the field
 * has an error OR the picker is showing a refusal, and described by the field's
 * message together with the picker's own reason while the field is not yet saying it.
 *
 * "Not yet" is ordinary rather than rare. A refusal reaches a bound form as a parse
 * error, and `<wr-form-field>` shows an error only once its control is touched or
 * dirty; a reactive `FormControl` learns of it through `updateValueAndValidity` with
 * `emitEvent: false`, which the field does not hear until the control's next event.
 * Until the field says it, the picker does — so the refusal is never silent,
 * whichever of the two ends up announcing it.
 *
 * With no field around the picker, there is nothing to stand between and `context` is
 * `null`: the input's `wrInput` then writes neither attribute, and the picker binds
 * them itself.
 *
 * @internal
 */
@Injectable()
export class WrDateInputField {
  /** The surrounding `<wr-form-field>` — skipping the picker's own node, whose view it is providing for. */
  readonly outer = inject(WR_FORM_FIELD, { optional: true, skipSelf: true });

  /** Id of the picker's live region, which doubles as the reason `aria-describedby` points at. */
  readonly statusId = `wr-date-picker-status-${++statusUid}`;

  private readonly source = signal<Signal<WrDateInputError | null> | null>(null);

  /** The refusal on show for the input the field describes — the only input, or a range's start. */
  readonly described = computed(() => this.source()?.() ?? null);

  /**
   * Hand over the signal holding that refusal. Called from the picker's constructor:
   * this service is built before the component it serves, so it cannot read the
   * component's state at its own construction.
   */
  describe(source: Signal<WrDateInputError | null>): void {
    this.source.set(source);
  }

  /** Whether the field is already rendering a message for this kind of error. */
  saysAlready(error: WrDateInputError): boolean {
    return this.outer?.errorKeys().includes(error.kind) ?? false;
  }

  readonly context: WrFormFieldContext | null = this.outer ? this.wrap(this.outer) : null;

  private wrap(outer: WrFormFieldContext): WrFormFieldContext {
    return {
      controlId: outer.controlId,
      adoptControlId: id => outer.adoptControlId(id),
      labelId: outer.labelId,
      hintId: outer.hintId,
      errorKeys: computed(() => {
        const keys = outer.errorKeys();
        const own = this.described();
        return own && !keys.includes(own.kind) ? [...keys, own.kind] : keys;
      }),
      describedBy: computed(() => {
        const own = this.described();
        const ids = [outer.describedBy(), own && !this.saysAlready(own) ? this.statusId : null].filter(Boolean);
        return ids.length ? ids.join(' ') : null;
      }),
    };
  }
}

/**
 * The view half of {@link WrDateInputField}: what the picker's own template sees as
 * its field. A VIEW provider, so it reaches the text inputs the picker renders and
 * never content projected into it; the host half is `WrDateInputField` itself, in
 * the component's `providers`.
 *
 * @internal
 */
export const WR_DATE_INPUT_FIELD_VIEW_PROVIDER: Provider = {
  provide: WR_FORM_FIELD,
  useFactory: () => inject(WrDateInputField).context,
};
