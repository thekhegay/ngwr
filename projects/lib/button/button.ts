/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { useConfigValue } from 'ngwr/config';
import { WrIcon, type WrIconName } from 'ngwr/icon';
import { WrSpinner } from 'ngwr/spinner';
import type { WrColor } from 'ngwr/theme';

import type { WrButtonIconPosition, WrButtonShape, WrButtonSize } from './interfaces';
import { WR_BUTTON_GROUP } from './tokens';

/**
 * Trigger an action. Renders as a `<wr-btn>` element, or attach to a
 * native `<button>` / `<a>` via the `wr-btn` attribute selector.
 *
 * @example
 * ```html
 * <button wr-btn color="primary">Save</button>
 * <a wr-btn color="primary" outlined>Cancel</a>
 * <wr-btn color="danger" icon="trash">Delete</wr-btn>
 * <wr-btn color="primary" shape="pill">Pill</wr-btn>
 * ```
 *
 * **Squircle?** Wrap with `[wrSquircle]` — the directive is the only
 * way ngwr ships smooth-corner clip-paths:
 *
 * ```html
 * <wr-btn wrSquircle [radius]="14">Squircle</wr-btn>
 * ```
 *
 * Inside a `<wr-btn-group shape="…">`, the group's shape is enforced on
 * every child — child `[shape]` inputs are ignored so the group reads as
 * one coherent control.
 *
 * @see https://ngwr.dev/reference/components/button
 */
@Component({
  selector: 'wr-btn, button[wr-btn], a[wr-btn]',
  templateUrl: './button.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'nativeDisabled()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    // The three below apply ONLY to the `<wr-btn>` element form — see
    // `isCustomHost`. A native `<button>` / `<a>` already has all of it.
    '[attr.role]': 'hostRole()',
    '[attr.tabindex]': 'hostTabIndex()',
    '[attr.aria-disabled]': 'hostAriaDisabled()',
    '(keydown)': 'onHostKeydown($event)',
  },
  imports: [WrIcon, WrSpinner],
})
export class WrButton {
  /**
   * Color variant. Omit for the neutral default style.
   *
   * Deliberately NOT configurable app-wide: the library's own chrome binds
   * `[color]="isCurrent ? 'primary' : null"`, where `null` means neutral, and a
   * configured intent would repaint every one of those buttons. See `WrConfig`.
   *
   * @default null
   */
  readonly color = input<WrColor | null>(null);

  /**
   * Size variant. Unset, it resolves through
   * `provideWrConfig({ button: { size } })` and then to `md`.
   *
   * @default 'md'
   */
  readonly size = input<WrButtonSize | null>(null);

  /**
   * Corner treatment — `rounded`, `pill` or `squircle`. `null` (default) falls
   * back to `rounded`. Inside a `<wr-btn-group shape="…">`, the group's shape
   * ALWAYS wins over this input — the group enforces a consistent corner
   * treatment across its members.
   *
   * @default null
   */
  readonly shape = input<WrButtonShape | null>(null);

  /**
   * Icon name to render alongside the label. The icon is hidden while
   * `loading` is `true` so the spinner can take its place.
   *
   * @default null
   */
  readonly icon = input<WrIconName | null>(null);

  /** Position of the icon relative to the label. @default 'start' */
  readonly iconPosition = input<WrButtonIconPosition>('start');

  /** Disable the button. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Outlined variant — colored text and border on a transparent background. @default false */
  readonly outlined = input(false, { transform: coerceBooleanProperty });

  /** Stretch the button to fill its parent's width. @default false */
  readonly block = input(false, { transform: coerceBooleanProperty });

  /** Show a spinner overlaying the label. Layout is preserved. @default false */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * When `loading` is `true` and this is also `true`, pointer events are
   * suppressed and the button reports as disabled to assistive tech.
   *
   * @default true
   */
  readonly isDisabledWhenLoading = input(true, { transform: coerceBooleanProperty });

  private readonly group = inject(WR_BUTTON_GROUP, { optional: true });

  /** The size, or the app-wide default, or `md`. @see useConfigValue */
  protected readonly resolvedSize = useConfigValue<WrButtonSize>(this.size, c => c.button?.size, 'md');

  /**
   * Resolved shape. Inside a `<wr-btn-group>`, the group ALWAYS wins — child
   * `[shape]` is ignored entirely so the group reads as one coherent control.
   * Outside a group, the button's own `[shape]` is used, falling back to
   * `rounded`. Not config-resolved: see `WrConfig` for why a boolean cannot
   * express this three-valued input.
   */
  protected readonly resolvedShape = computed<WrButtonShape>(() =>
    this.group ? (this.group.shape() ?? 'rounded') : (this.shape() ?? 'rounded')
  );

  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Whether this instance is the `<wr-btn>` ELEMENT rather than the attribute
   * form on a native `<button>` / `<a>`.
   *
   * The element form is documented as first-class and is what the pagination,
   * event-calendar and popconfirm chrome use — but a custom element has no
   * button semantics of its own. It was rendering with no `role`, no
   * `tabindex` and no keyboard activation, so it was invisible to assistive
   * tech and unreachable by Tab. Measured in Chromium against the built site:
   * the whole `wr-pagination` subtree, 26 elements, contained ZERO focusable
   * nodes and sixty Tab presses never entered it. axe cannot see this — an
   * unknown element with no role simply is not an interactive control to it,
   * which is the same blind spot that lets `disabled` pass unnoticed on a
   * custom element.
   */
  private readonly isCustomHost = this.hostEl.nativeElement.tagName === 'WR-BTN';

  private readonly isOff = computed(() => this.disabled() || (this.loading() && this.isDisabledWhenLoading()));

  protected readonly nativeDisabled = computed<'' | null>(() => (this.isOff() ? '' : null));

  protected readonly hostRole = computed<'button' | null>(() => (this.isCustomHost ? 'button' : null));

  /** Out of the tab order while off — `disabled` is inert on a custom element. */
  protected readonly hostTabIndex = computed<'0' | null>(() => (this.isCustomHost && !this.isOff() ? '0' : null));

  protected readonly hostAriaDisabled = computed<'true' | null>(() =>
    this.isCustomHost && this.isOff() ? 'true' : null
  );

  /**
   * Enter and Space activate a button. A native one does this for free; a
   * custom element does not, so without this the element form could be focused
   * (once it had a tabindex) and still not be operable.
   *
   * `preventDefault` on Space is not optional — it scrolls the page otherwise.
   * The pointer path needs no guard here: `.wr-btn[disabled]` already sets
   * `pointer-events: none`.
   */
  protected onHostKeydown(event: KeyboardEvent): void {
    if (!this.isCustomHost) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    if (this.isOff()) return;
    this.hostEl.nativeElement.click();
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-btn'];

    const color = this.color();
    if (color) parts.push(`wr-btn--${color}`);

    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-btn--${size}`);

    const shape = this.resolvedShape();
    if (shape !== 'rounded') parts.push(`wr-btn--${shape}`);

    if (this.outlined()) parts.push('wr-btn--outlined');
    if (this.block()) parts.push('wr-btn--block');
    if (this.loading()) parts.push('wr-btn--loading');

    const hasAdornment = !!this.icon() || this.loading();
    if (hasAdornment) parts.push(`wr-btn--icon-${this.iconPosition()}`);

    return parts.join(' ');
  });
}
