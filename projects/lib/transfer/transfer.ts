/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model, output, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';

import type { WrTransferItem } from './interfaces';

/** A pane's rows plus the header state derived from them. */
interface PaneState {
  readonly rows: readonly WrTransferItem[];
  readonly checkedCount: number;
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
  host: { '[class]': 'classes()' },
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

  /** Accessible name of the move-right button. Falls back to `transfer.toTarget`. */
  readonly toTargetLabel = input<string | null>(null);

  /** Accessible name of the move-left button. Falls back to `transfer.toSource`. */
  readonly toSourceLabel = input<string | null>(null);

  protected readonly resolvedSourceTitle = useI18nText(this.sourceTitle, 'transfer.source', 'Available');
  protected readonly resolvedTargetTitle = useI18nText(this.targetTitle, 'transfer.target', 'Selected');
  protected readonly resolvedSearch = useI18nText(this.searchPlaceholder, 'transfer.search', 'Search');
  protected readonly resolvedEmpty = useI18nText(this.emptyText, 'transfer.empty', 'Nothing here');
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

  private readonly valueSet = computed(() => new Set(this.value()));

  protected readonly source = computed<PaneState>(() =>
    this.pane(
      this.items().filter(item => !this.valueSet().has(item.value)),
      this.sourceQuery(),
      this.sourceChecked()
    )
  );

  protected readonly target = computed<PaneState>(() =>
    this.pane(
      // Right-pane order follows `value`, not `items`: the order a user built is
      // the one they expect to read back.
      this.value()
        .map(v => this.items().find(item => item.value === v))
        .filter((item): item is WrTransferItem => item !== undefined),
      this.targetQuery(),
      this.targetChecked()
    )
  );

  protected readonly canMoveRight = computed(() => !this.disabled() && this.source().checkedCount > 0);
  protected readonly canMoveLeft = computed(() => !this.disabled() && this.target().checkedCount > 0);

  protected readonly classes = computed(() => {
    const parts = ['wr-transfer'];
    if (this.disabled()) parts.push('wr-transfer--disabled');
    if (this.searchable()) parts.push('wr-transfer--searchable');
    return parts.join(' ');
  });

  protected isChecked(pane: 'source' | 'target', item: WrTransferItem): boolean {
    return (pane === 'source' ? this.sourceChecked() : this.targetChecked()).includes(item.value);
  }

  protected toggle(pane: 'source' | 'target', item: WrTransferItem, checked: boolean): void {
    if (item.disabled) return;
    const box = pane === 'source' ? this.sourceChecked : this.targetChecked;
    const current = box();
    box.set(checked ? [...current, item.value] : current.filter(v => v !== item.value));
  }

  /** Header checkbox — stages or clears every enabled row the filter shows. */
  protected toggleAll(pane: 'source' | 'target', checked: boolean): void {
    const state = pane === 'source' ? this.source() : this.target();
    const box = pane === 'source' ? this.sourceChecked : this.targetChecked;
    box.set(checked ? state.rows.filter(item => !item.disabled).map(item => item.value) : []);
  }

  protected onSearch(pane: 'source' | 'target', event: Event): void {
    const query = (event.target as HTMLInputElement | null)?.value ?? '';
    (pane === 'source' ? this.sourceQuery : this.targetQuery).set(query);
  }

  protected moveRight(): void {
    const moving = this.sourceChecked();
    if (moving.length === 0) return;
    this.value.set([...this.value(), ...moving]);
    this.sourceChecked.set([]);
    this.touch.emit();
  }

  protected moveLeft(): void {
    const moving = new Set(this.targetChecked());
    if (moving.size === 0) return;
    this.value.set(this.value().filter(v => !moving.has(v)));
    this.targetChecked.set([]);
    this.touch.emit();
  }

  /** Filter, then derive the header state from what survived. */
  private pane(rows: readonly WrTransferItem[], query: string, checked: readonly unknown[]): PaneState {
    const q = query.trim().toLowerCase();
    const visible = q ? rows.filter(item => item.label.toLowerCase().includes(q)) : rows;
    const enabled = visible.filter(item => !item.disabled);
    const staged = new Set(checked);
    const checkedCount = enabled.filter(item => staged.has(item.value)).length;
    return {
      rows: visible,
      checkedCount,
      allChecked: enabled.length > 0 && checkedCount === enabled.length,
      someChecked: checkedCount > 0 && checkedCount < enabled.length,
    };
  }
}
