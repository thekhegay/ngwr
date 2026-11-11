/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { useI18nText } from 'ngwr/i18n';
import { WrTextarea } from 'ngwr/textarea';
import { wrIsComposing, WR_KEYS, wrCheckStyles } from 'ngwr/utils';

/**
 * A chat composer: an autosizing field with a send button. Enter sends,
 * Shift+Enter adds a line, Ctrl+Enter and Cmd+Enter always send. The text is
 * emitted through `send` and the composer decides nothing about where it goes.
 *
 * A signal-forms native control: it implements `FormValueControl<string>`, so
 * `[formField]` binds straight to its `value` model. `[(value)]` works
 * standalone.
 *
 * What sends and what does not:
 *
 * - Whitespace-only text never sends; the button is disabled until there is
 *   something to send, and Enter does nothing.
 * - `disabled`, `readonly` and `sending` all block sending and keep the text.
 *   `sending` also marks the composer `aria-busy`; the field stays editable so
 *   the next message can be typed.
 * - An Enter that confirms an IME composition never sends. Both signals are
 *   read, `isComposing` and `keyCode === 229`, because Safari fires
 *   `compositionend` before the keydown, so `isComposing` is already `false`
 *   on the committing keystroke.
 *
 * The text is trimmed and, with `clearOnSend` (the default), the field is
 * cleared BEFORE `send` emits: an app whose request fails puts the text back
 * through the composer's own model, `composer.value.set(text)`, at any time,
 * and nothing overwrites it. A model bound with `[(value)]` takes that write
 * only once change detection has run in between: written back synchronously
 * from the handler, the bound expression still holds the value Angular last
 * bound, so the input is skipped. An app that would rather keep the text until
 * the request succeeds sets `[clearOnSend]="false"` and clears the model
 * itself. Focus stays in the field after sending, unless the `send` handler
 * moved it.
 *
 * @example
 * ```html
 * <wr-comment-composer placeholder="Message" [(value)]="draft" (send)="post($event)" />
 *
 * <wr-comment-composer [sending]="posting()" [clearOnSend]="false" (send)="post($event)">
 *   <button wrComposerActions wr-btn size="sm">Attach</button>
 * </wr-comment-composer>
 * ```
 *
 * @see https://ngwr.dev/reference/components/comment
 */
@Component({
  selector: 'wr-comment-composer',
  templateUrl: './comment-composer.html',
  imports: [WrButton, WrTextarea],
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'sending() ? "true" : null',
  },
})
export class WrCommentComposer implements FormValueControl<string> {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('comment');
  }

  /** Native placeholder text. @default '' */
  readonly placeholder = input<string>('');

  /**
   * Accessible name for the field. Falls back to the placeholder: the native
   * `<textarea>` lives inside the component, so a `<label for>` outside cannot
   * reach it.
   */
  readonly ariaLabel = input<string | null>(null);

  /** Accessible name of the send button. Falls back to `comment.send`, then `'Send'`. */
  readonly sendLabel = input<string | null>(null);

  /** Visible row count while the field is empty. @default 1 */
  readonly rows = input(1, { transform: (v: unknown): number => coerceNumberProperty(v, 1) });

  /** Rows the field grows to before it scrolls on its own. @default 6 */
  readonly maxRows = input(6, { transform: (v: unknown): number => coerceNumberProperty(v, 6) });

  /**
   * Disable the field and the button. Bound automatically from the field's
   * disabled state when used with `[formField]`. The text is kept.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Read-only state: the text is shown and announced, keeps its tab stop and
   * cannot be edited or sent.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * A send is in flight: the button is disabled, the host is `aria-busy` and
   * Enter does nothing. The field stays editable and the text is kept.
   *
   * @default false
   */
  readonly sending = input(false, { transform: coerceBooleanProperty });

  /**
   * `true`: Enter sends and Shift+Enter adds a line. `false`: Enter adds a line
   * and only Ctrl+Enter or Cmd+Enter sends.
   *
   * @default true
   */
  readonly enterSends = input(true, { transform: coerceBooleanProperty });

  /**
   * Clear the field before `send` emits. With `false` the text stays until the
   * app clears the model itself.
   *
   * @default true
   */
  readonly clearOnSend = input(true, { transform: coerceBooleanProperty });

  /** The draft. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<string>('');

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** The trimmed text, once per send. Where it goes is the app's business. */
  readonly send = output<string>();

  protected readonly resolvedSendLabel = useI18nText(this.sendLabel, 'comment.send', 'Send');

  /** Whether a send would go through right now. */
  protected readonly canSend = computed(
    () => this.value().trim() !== '' && !this.disabled() && !this.readonly() && !this.sending()
  );

  protected readonly classes = computed(() => {
    const parts = ['wr-comment-composer'];
    if (this.disabled()) parts.push('wr-comment-composer--disabled');
    if (this.readonly()) parts.push('wr-comment-composer--readonly');
    if (this.sending()) parts.push('wr-comment-composer--sending');
    return parts.join(' ');
  });

  private readonly field = viewChild.required(WrTextarea);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Focus the field, which is what Signal Forms calls to focus this control. */
  focus(options?: FocusOptions): void {
    this.field().focus(options);
  }

  /**
   * Send the current text, exactly as the button and Enter do: nothing happens
   * for whitespace-only text or while `disabled`, `readonly` or `sending`.
   */
  submit(): void {
    if (!this.canSend()) return;
    const text = this.value().trim();
    const hadFocus = this.host.nativeElement.contains(this.host.nativeElement.ownerDocument.activeElement);
    if (this.clearOnSend()) this.value.set('');
    this.send.emit(text);
    // A keyboard user is on the button, which sending just disabled: hand focus
    // back unless the handler moved it. A pointer never took it (see the template).
    if (hadFocus && this.host.nativeElement.contains(this.host.nativeElement.ownerDocument.activeElement)) {
      this.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== WR_KEYS.ENTER || wrIsComposing(event)) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier && (event.shiftKey || event.altKey || !this.enterSends())) return;
    // A sending Enter never reaches the field: on empty text it would only add
    // blank lines that the next send trims away.
    event.preventDefault();
    this.submit();
  }
}
