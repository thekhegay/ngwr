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
  output,
  signal,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrIcon, type WrIconName } from 'ngwr/icon';
import { getFocusableElements } from 'ngwr/utils';

import type { WrAlertType } from './types';

/**
 * Inline status banner. Use for feedback messages — saved/failed/notice etc.
 *
 * @example
 * ```html
 * <wr-alert title="Saved" message="Your changes are live." type="success" />
 * <wr-alert title="Failed" type="danger" closable (closed)="onClose()" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/alert
 */
@Component({
  selector: 'wr-alert',
  templateUrl: './alert.html',
  imports: [WrIcon],
  encapsulation: ViewEncapsulation.None,
  host: {
    // `title` is an input, and a static attribute that feeds an input is ALSO
    // written onto the host — where the browser shows it as a native tooltip
    // over the whole component, and where it feeds the accessible name of any
    // element that has a role. `<wr-alert title="Heads up">` is the documented
    // spelling, so every page writing it shipped both. A bound `[title]` never
    // did this, which is why the two forms behaved differently for no reason a
    // reader could see.
    '[attr.title]': 'null',
    '[class]': 'classes()',
    '[attr.role]': 'liveRole()',
    '[attr.aria-live]': 'liveLevel()',
  },
})
export class WrAlert {
  /** Accessible name. Falls back to `alert.close`, then `'Close alert'`. */
  readonly closeLabel = input<string | null>(null);

  protected readonly resolvedCloseLabel = useI18nText(this.closeLabel, 'alert.close', 'Close alert');

  /**
   * Optional headline shown at the top of the alert.
   *
   * @default null
   */
  readonly title = input<string | null>(null);

  /**
   * Visual variant.
   *
   * @default 'info'
   */
  readonly type = input<WrAlertType>('info');

  /**
   * Override the default per-type icon with any ngwr icon name.
   *
   * @default null
   */
  readonly iconName = input<WrIconName | null>(null);

  /**
   * Optional secondary message rendered below the title.
   *
   * @default null
   */
  readonly message = input<string | null>(null);

  /**
   * When `true`, renders a leading status icon matching the `type`.
   * Pass `false` to hide. Ignored when `iconName` is set.
   *
   * @default true
   */
  readonly icon = input(true, { transform: coerceBooleanProperty });

  /**
   * When `true`, renders a close button.
   *
   * @default false
   */
  readonly closable = input(false, { transform: coerceBooleanProperty });

  /**
   * Emitted when the user dismisses the alert via the close button. If the close
   * button had focus, focus moves on to the next focusable element after the alert
   * (or the one before it, when nothing follows) — unless a `(closed)` handler has
   * placed it somewhere itself.
   */
  readonly closed = output<void>();

  protected readonly dismissed = signal(false);

  protected readonly classes = computed(() => {
    const parts = ['wr-alert', `wr-alert--${this.type()}`];
    if (this.dismissed()) parts.push('wr-alert--dismissed');
    return parts.join(' ');
  });

  /** Escalate role/aria-live for danger/warning alerts. */
  protected readonly liveRole = computed(() =>
    this.dismissed() ? null : this.type() === 'danger' ? 'alert' : 'status'
  );
  protected readonly liveLevel = computed(() =>
    this.dismissed() ? null : this.type() === 'danger' || this.type() === 'warning' ? 'assertive' : 'polite'
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected onClose(): void {
    const host = this.host.nativeElement;
    const hadFocus = host.contains(host.ownerDocument.activeElement);
    this.dismissed.set(true);
    this.closed.emit();
    if (hadFocus) afterNextRender(() => this.handOnFocus(), { injector: this.injector });
  }

  /**
   * The close button is removed with the rest of the content, and a focused element
   * that leaves the DOM drops the caret on `<body>`: a keyboard user's next Tab, and
   * a screen reader's reading position, started over from the top of the page. Run
   * after the render that removed it, so a `(closed)` handler that moved focus on
   * purpose is seen and left alone.
   */
  private handOnFocus(): void {
    const host = this.host.nativeElement;
    const doc = host.ownerDocument;
    const active = doc.activeElement;
    if (active && active !== doc.body) return;
    // Tab stops only: a roving composite parks its other items at -1. The host has
    // nothing focusable left inside it, so every stop is either before or after it.
    const stops = getFocusableElements(doc.body).filter(el => el.tabIndex >= 0);
    // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
    const after = stops.findIndex(el => (host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    (after >= 0 ? stops[after] : stops.at(-1))?.focus();
  }
}
