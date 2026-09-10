/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WR_FORM_FIELD, useFormFieldAria } from 'ngwr/form';
import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';

import type { WrTransferItem } from './interfaces';

/** A pane's rows plus the header state derived from them. */
interface PaneState {
  readonly rows: readonly WrTransferItem[];
  /**
   * The staged values this pane is actually SHOWING — visible and enabled. The
   * staging signals can hold more than that (a filter change hides rows without
   * unstaging them), and every consumer of the staged set has to agree on which
   * one it means: the count, the header checkbox and the move all read this.
   */
  readonly checked: readonly unknown[];
  readonly checkedCount: number;
  readonly enabledCount: number;
  readonly allChecked: boolean;
  readonly someChecked: boolean;
}

/**
 * Dual-listbox picker: two panes and the buttons that move rows between them.
 *
 * The full item set is `[items]` and the RIGHT pane is the value — `[(value)]`
 * holds the chosen `WrTransferItem['value']`s, everything else stays left. The
 * checked state inside each pane is transient staging, deliberately not part of
 * the value: what a form cares about is which rows ended up on the right.
 *
 * A signal-forms native control (`FormValueControl<readonly unknown[]>`), so
 * `[formField]` binds straight to `value`; `[(ngModel)]` and reactive forms keep
 * working through Angular's bridge, and `[(value)]` is the standalone shape.
 *
 * @example
 * ```html
 * <!-- Standalone -->
 * <wr-transfer [items]="permissions" [(value)]="granted" />
 *
 * <!-- Searchable, with pane titles -->
 * <wr-transfer
 *   searchable
 *   sourceTitle="Available"
 *   targetTitle="Granted"
 *   [items]="permissions"
 *   [formField]="form.granted"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/transfer
 */
@Component({
  selector: 'wr-transfer',
  templateUrl: './transfer.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    // `role="group"` so the error state below has somewhere legible to live: the
    // control is a composite with no single element carrying its semantics, and
    // `aria-invalid` on a bare `generic` host is announced by nothing.
    role: 'group',
    '[attr.aria-invalid]': 'fieldAria.ariaInvalid()',
    '[attr.aria-describedby]': 'fieldAria.describedBy()',
  },
  // The transfer is the control a `<wr-form-field>` wraps; the checkboxes and
  // the search inputs in its own template are parts, not controls. Without this
  // shield each of them found the field's token and announced the one error as
  // its own — which is why `fieldAria` below reads the field with `skipSelf`.
  providers: [{ provide: WR_FORM_FIELD, useValue: null }],
  imports: [WrButton, WrCheckbox, WrInput],
})
export class WrTransfer implements FormValueControl<readonly unknown[]> {
  /** Every row, in either pane. Membership of the right pane is `value`. */
  readonly items = input<readonly WrTransferItem[]>([]);

  /**
   * Values currently in the RIGHT pane. Two-way bindable; bound automatically
   * by `[formField]` / `[(ngModel)]`.
   */
  readonly value = model<readonly unknown[]>([]);

  /** Emitted on blur / commit so a bound field marks itself touched. */
  readonly touch = output<void>();

  /** Disable the whole control. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse changes to the value while both panes stay focusable and readable.
   * Bound automatically from the field's readonly state when used with
   * `[formField]`.
   *
   * The move buttons go inert and the row checkboxes go read-only; SEARCH keeps
   * working, because filtering a pane changes what is shown and not what is
   * chosen. No `aria-readonly` on the host: role `group` does not support the
   * state, so each row's checkbox mirrors its own instead.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria({ skipSelf: true });

  /** Show a filter box above each pane. @default false */
  readonly searchable = input(false, { transform: coerceBooleanProperty });

  /** Heading above the left pane. Falls back to `transfer.source`. */
  readonly sourceTitle = input<string | null>(null);

  /** Heading above the right pane. Falls back to `transfer.target`. */
  readonly targetTitle = input<string | null>(null);

  /** Placeholder in both filter boxes. Falls back to `transfer.search`. */
  readonly searchPlaceholder = input<string | null>(null);

  /** Shown in a pane with no rows. Falls back to `transfer.empty`. */
  readonly emptyText = input<string | null>(null);

  /**
   * Accessible name of each pane's select-all checkbox, composed with the pane
   * heading. Falls back to `transfer.selectAll`.
   */
  readonly selectAllLabel = input<string | null>(null);

  /** Accessible name of the move-right button. Falls back to `transfer.toTarget`. */
  readonly toTargetLabel = input<string | null>(null);

  /** Accessible name of the move-left button. Falls back to `transfer.toSource`. */
  readonly toSourceLabel = input<string | null>(null);

  protected readonly resolvedSourceTitle = useI18nText(this.sourceTitle, 'transfer.source', 'Available');
  protected readonly resolvedTargetTitle = useI18nText(this.targetTitle, 'transfer.target', 'Selected');
  protected readonly resolvedSearch = useI18nText(this.searchPlaceholder, 'transfer.search', 'Search');
  protected readonly resolvedEmpty = useI18nText(this.emptyText, 'transfer.empty', 'Nothing here');
  protected readonly resolvedSelectAll = useI18nText(this.selectAllLabel, 'transfer.selectAll', 'Select all');
  protected readonly resolvedToTarget = useI18nText(this.toTargetLabel, 'transfer.toTarget', 'Move to selected');
  protected readonly resolvedToSource = useI18nText(this.toSourceLabel, 'transfer.toSource', 'Move to available');

  /** `{{checked}} / {{total}}` under each heading. @internal */
  protected readonly countLabel = useI18nFormatter('transfer.count', '{{checked}} / {{total}}');

  /** Pane order — the template iterates it so both panes share one block. */
  protected readonly panes = ['source', 'target'] as const;

  private readonly sourceQuery = signal('');
  private readonly targetQuery = signal('');

  /** Staged rows, per pane. Cleared as soon as a move commits them. */
  private readonly sourceChecked = signal<readonly unknown[]>([]);
  private readonly targetChecked = signal<readonly unknown[]>([]);

  // The value as a guaranteed array — a classic-forms binding can write null even
  // though the type is `readonly unknown[]`, so normalise every read. Same hazard
  // `wr-checkbox-group` guards; here an unguarded `.map` threw outright.
  private readonly selected = computed<readonly unknown[]>(() => {
    const v = this.value();
    return Array.isArray(v) ? v : [];
  });

  private readonly valueSet = computed(() => new Set(this.selected()));

  protected readonly source = computed<PaneState>(() =>
    this.pane(
      this.items().filter(item => !this.valueSet().has(item.value)),
      this.sourceQuery(),
      this.sourceChecked()
    )
  );

  protected readonly target = computed<PaneState>(() => {
    // Right-pane order follows `value`, not `items`: the order a user built is
    // the one they expect to read back.
    const rows = this.selected()
      .map(v => this.items().find(item => item.value === v))
      .filter((item): item is WrTransferItem => item !== undefined);

    if (isDevMode() && rows.length !== this.selected().length) this.warnAboutOrphans();

    return this.pane(rows, this.targetQuery(), this.targetChecked());
  });

  /**
   * Say something when `value` holds a value no `items` entry matches.
   *
   * Such a value is in NEITHER pane — the left one filters out anything already
   * selected and the right one can only render rows it found — and the header
   * counts the rows it shows, so nothing on screen contradicts anything. The
   * result is a value the user can neither see nor remove, and no sign that it
   * is there.
   *
   * A warning rather than an invented row, which matches how the library treats
   * the same question elsewhere: `wr-select` renders a value outside its option
   * list only under an explicit `freeText`, so an unmatched value is a mode a
   * consumer opts into, not a shape a component guesses at. It also stays quiet
   * about the common transient case — `items` arriving after `value` — because
   * the message names the values and a developer can see them settle.
   */
  private warnAboutOrphans(): void {
    const known = new Set(this.items().map(item => item.value));
    const orphans = this.selected().filter(v => !known.has(v));
    if (orphans.length === 0) return;

    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] <wr-transfer>: ${orphans.length} value(s) in \`value\` match no \`items\` entry ` +
        `and are rendered in neither pane, so a user can neither see nor remove them: ` +
        `${orphans.map(v => JSON.stringify(v)).join(', ')}. ` +
        `If \`items\` loads after \`value\`, this settles on its own.`
    );
  }

  protected readonly canMoveRight = computed(
    () => !this.disabled() && !this.readonly() && this.source().checkedCount > 0
  );
  protected readonly canMoveLeft = computed(
    () => !this.disabled() && !this.readonly() && this.target().checkedCount > 0
  );

  protected readonly classes = computed(() => {
    const parts = ['wr-transfer'];
    if (this.disabled()) parts.push('wr-transfer--disabled');
    else if (this.readonly()) parts.push('wr-transfer--readonly');
    if (this.searchable()) parts.push('wr-transfer--searchable');
    return parts.join(' ');
  });

  protected isChecked(pane: 'source' | 'target', item: WrTransferItem): boolean {
    return (pane === 'source' ? this.sourceChecked() : this.targetChecked()).includes(item.value);
  }

  protected toggle(pane: 'source' | 'target', item: WrTransferItem, checked: boolean): void {
    if (item.disabled || this.readonly()) return;
    const box = pane === 'source' ? this.sourceChecked : this.targetChecked;
    const current = box();
    if (checked) {
      box.set([...current, item.value]);
      return;
    }
    // A `Set` compares with SameValueZero, which is what `WrTransferItem['value']`
    // is documented to use and what `isChecked`'s `includes` already does. A `!==`
    // filter cannot remove `NaN` from its own list, so such a row drew itself
    // unchecked while staying staged.
    const next = new Set(current);
    next.delete(item.value);
    box.set([...next]);
  }

  /** Header checkbox — stages or clears every enabled row the filter shows. */
  protected toggleAll(pane: 'source' | 'target', checked: boolean): void {
    if (this.readonly()) return;
    const state = pane === 'source' ? this.source() : this.target();
    const box = pane === 'source' ? this.sourceChecked : this.targetChecked;
    box.set(checked ? state.rows.filter(item => !item.disabled).map(item => item.value) : []);
  }

  protected onSearch(pane: 'source' | 'target', event: Event): void {
    const query = (event.target as HTMLInputElement | null)?.value ?? '';
    (pane === 'source' ? this.sourceQuery : this.targetQuery).set(query);
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /**
   * Keep focus in the widget after a move.
   *
   * A move empties the pane's staging set, which is exactly what disables the
   * button that was just pressed — so the element holding DOM focus went
   * `disabled` as a RESULT of its own activation and the browser dropped focus
   * to `<body>`. From there the next Tab restarts at the top of the document,
   * which for a keyboard user is being thrown out of a control they were in the
   * middle of using.
   *
   * The landing is the FIRST ROW OF THE PANE THE ROWS ARRIVED IN, and the
   * obvious alternative does not work: after a move BOTH buttons are disabled,
   * because each needs something ticked and the move cleared the tick on one
   * side and arrived unticked on the other. The rows that just moved are where
   * the user's attention is and where the next action lives, so that is where
   * focus goes.
   *
   * `afterNextRender`, not `queueMicrotask`: under zoneless CD the microtask
   * runs before the moved rows are in the DOM, so the focus call would land on
   * the pane as it was before the move.
   */
  private restoreFocusAfterMove(landing: 'source' | 'target'): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const pane =
          landing === 'target'
            ? root.querySelector<HTMLElement>('.wr-transfer__pane--target')
            : root.querySelector<HTMLElement>('.wr-transfer__pane:not(.wr-transfer__pane--target)');
        const row = pane?.querySelector<HTMLInputElement>('.wr-transfer__item input:not([disabled])');
        row?.focus();
      },
      { injector: this.injector }
    );
  }

  protected moveRight(): void {
    if (this.disabled() || this.readonly()) return;
    // `source().checked`, not the raw staging box: rows a filter change hid are
    // neither counted nor ticked any more, so moving them would transfer rows the
    // pane never showed as chosen — and, since staging outlives an external write
    // to `value`, could land the same value on the right twice.
    const moving = this.source().checked;
    if (moving.length === 0) return;
    this.value.set([...this.selected(), ...moving]);
    this.sourceChecked.set([]);
    this.touch.emit();
    this.restoreFocusAfterMove('target');
  }

  protected moveLeft(): void {
    if (this.disabled() || this.readonly()) return;
    const moving = new Set(this.target().checked);
    if (moving.size === 0) return;
    this.value.set(this.selected().filter(v => !moving.has(v)));
    this.targetChecked.set([]);
    this.touch.emit();
    this.restoreFocusAfterMove('source');
  }

  /** Filter, then derive the header state from what survived. */
  private pane(rows: readonly WrTransferItem[], query: string, checked: readonly unknown[]): PaneState {
    const q = query.trim().toLowerCase();
    const visible = q ? rows.filter(item => item.label.toLowerCase().includes(q)) : rows;
    const enabled = visible.filter(item => !item.disabled);
    const staged = new Set(checked);
    const shown = enabled.filter(item => staged.has(item.value)).map(item => item.value);
    return {
      rows: visible,
      checked: shown,
      checkedCount: shown.length,
      enabledCount: enabled.length,
      allChecked: enabled.length > 0 && shown.length === enabled.length,
      someChecked: shown.length > 0 && shown.length < enabled.length,
    };
  }
}
