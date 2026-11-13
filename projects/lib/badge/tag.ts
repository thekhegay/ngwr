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
  EnvironmentInjector,
  ViewEncapsulation,
  afterEveryRender,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { useI18nFormatter, wrReadI18nText } from 'ngwr/i18n';
import { WrIcon, type WrIconName } from 'ngwr/icon';
import { WrSpinner } from 'ngwr/spinner';
import type { WrColor } from 'ngwr/theme';
import { wrCheckStyles, wrGetFocusableElements } from 'ngwr/utils';

import type { WrTagIconPosition } from './types';

/**
 * Rich inline label — icons, loading state, three visual styles
 * (solid / outlined / transparent). Reach for `<wr-badge>` when all
 * you need is a colored text chip.
 *
 * @example
 * ```html
 * <wr-tag>Default</wr-tag>
 * <wr-tag color="success" icon="checkmark">Done</wr-tag>
 * <wr-tag color="primary" outlined rounded>Beta</wr-tag>
 * <wr-tag color="warning" loading>Saving</wr-tag>
 * <wr-tag closable (removed)="drop(topic)">{{ topic }}</wr-tag>
 * ```
 *
 * @see https://ngwr.dev/reference/components/badge
 */
@Component({
  selector: 'wr-tag',
  templateUrl: './tag.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-tag',
    '[class]': 'classes()',
    '(keydown.delete)': 'onRemoveKey($event)',
    '(keydown.backspace)': 'onRemoveKey($event)',
  },
  imports: [WrIcon, WrSpinner],
})
export class WrTag {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('badge');
    // The label is projected, so only the DOM knows it, and the parent can
    // rewrite it without this component being checked.
    afterEveryRender(() => {
      if (this.closable()) this.text.set(this.readText());
    });
  }

  /**
   * Color variant — decoration or category, never the state on its own. The
   * label carries the state (`Failed`, not a red `Build`): four of the five
   * intents share one lightness and `success` against `danger` is 1.004:1, so a
   * reader who cannot separate red from green cannot tell those two tags
   * apart, and `primary` and `info` are the same blue to everyone. When a tag has to stand
   * for a status by itself, give it an `icon` as well — register one with
   * `provideWrIcons(wrLucideIcons({ 'octagon-alert': OctagonAlert }))`, then write
   * `<wr-tag color="danger" icon="octagon-alert">Failed</wr-tag>`.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor | null>('primary');

  /**
   * Icon name shown alongside the content — the one channel besides the label
   * that a tag has, so the one to reach for when colour is carrying a status.
   * Nothing ships built in: register the name through `provideWrIcons` first.
   * The icon is replaced by a spinner when `loading` is true.
   *
   * @default null
   */
  readonly icon = input<WrIconName | null>(null);

  /**
   * Where the icon/spinner is rendered.
   *
   * @default 'start'
   */
  readonly iconPosition = input<WrTagIconPosition>('start');

  /**
   * Outlined style — colored text and border on a tinted background.
   *
   * @default false
   */
  readonly outlined = input(false, { transform: coerceBooleanProperty });

  /**
   * Transparent style — colored text on a low-opacity tint, no border.
   *
   * @default false
   */
  readonly transparent = input(false, { transform: coerceBooleanProperty });

  /**
   * Pill-shaped corners.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Adds a hover state — use when the tag is interactive (button/link).
   *
   * @default false
   */
  readonly hoverable = input(false, { transform: coerceBooleanProperty });

  /**
   * Show a spinner in place of the icon.
   *
   * @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * Renders a remove button at the end of the tag. The tag does not remove
   * itself: drop it from your list in `(removed)`. A `loading` tag keeps the
   * button; bind `[closable]="!saving"` to withhold it.
   *
   * @default false
   */
  readonly closable = input(false, { transform: coerceBooleanProperty });

  /**
   * Accessible name of the remove button. Falls back to the catalog's
   * `tag.remove` with the tag's own text, "Remove Angular", or to
   * `common.remove` for a tag with no text.
   *
   * @default null
   */
  readonly removeLabel = input<string | null>(null);

  /**
   * Emitted when the user removes the tag: a click on the remove button, or
   * Delete / Backspace on it (or on the tag itself, if you made it focusable).
   * The click does not reach a `(click)` on the tag. If the button had focus and
   * the tag is gone after the next render, focus moves to the next tab stop, or
   * the one before it when nothing follows.
   */
  readonly removed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly environment = inject(EnvironmentInjector);

  private readonly text = signal('');
  private readonly removeText = useI18nFormatter('tag.remove', 'Remove {{label}}');
  private readonly removeBare = wrReadI18nText('common.remove', 'Remove');

  protected readonly removeName = computed(() => {
    const given = this.removeLabel();
    if (given) return given;
    const label = this.text();
    return label ? this.removeText({ label }) : this.removeBare();
  });

  protected readonly classes = computed(() => {
    const parts: string[] = [];

    const color = this.color();
    if (color) parts.push(`wr-tag--${color}`);

    if (this.outlined()) parts.push('wr-tag--outlined');
    if (this.transparent()) parts.push('wr-tag--transparent');
    if (this.rounded()) parts.push('wr-tag--rounded');
    if (this.hoverable()) parts.push('wr-tag--hoverable');
    if (this.loading()) parts.push('wr-tag--loading');
    if (this.closable()) parts.push('wr-tag--closable');

    const hasAdornment = !!this.icon() || this.loading();
    if (hasAdornment) parts.push(`wr-tag--icon-${this.iconPosition()}`);

    return parts.join(' ');
  });

  protected onRemove(event: Event): void {
    event.stopPropagation();
    this.remove();
  }

  protected onRemoveKey(event: Event): void {
    if (!this.closable()) return;
    const host = this.host.nativeElement;
    if (event.target !== host && event.target !== this.removeButton()) return;
    event.preventDefault();
    this.remove();
  }

  private remove(): void {
    const host = this.host.nativeElement;
    const doc = host.ownerDocument;
    const button = this.removeButton();
    const stops =
      button && doc.activeElement === button ? wrGetFocusableElements(doc.body).filter(el => el.tabIndex >= 0) : [];
    const at = button ? stops.indexOf(button) : -1;
    this.removed.emit();
    if (at < 0) return;
    // The environment's injector: this component's own is destroyed with the tag.
    afterNextRender(
      () => {
        const active = doc.activeElement;
        if (host.isConnected || (active && active !== doc.body)) return;
        [stops[at + 1], stops[at - 1]].find(el => el?.isConnected)?.focus();
      },
      { injector: this.environment }
    );
  }

  private removeButton(): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(':scope > .wr-tag__remove');
  }

  private readText(): string {
    let text = '';
    for (const node of this.host.nativeElement.childNodes) {
      // Angular's anchors are comments, and a comment's `textContent` is its data.
      if (node.nodeType === Node.COMMENT_NODE) continue;
      if (node instanceof Element && node.matches('.wr-tag__adornment, .wr-tag__remove')) continue;
      text += node.textContent ?? '';
    }
    return text.replace(/\s+/g, ' ').trim();
  }
}
