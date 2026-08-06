/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import {
  type ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { readI18nText, useI18nFormatter } from 'ngwr/i18n';
import { WR_OVERLAY } from 'ngwr/overlay';

import { getCaretCoordinates } from './caret';
import type { WrMentionCommit, WrMentionItem } from './interfaces';
import { WrMentionPanel, wrMentionOptionId } from './mention-panel';

interface ActiveState {
  trigger: string;
  query: string;
  startIndex: number;
}

/**
 * Deterministic under prerender, unlike `randomId()` — `aria-controls` is a
 * static host binding, so it renders on the server too, and a random value would
 * differ between that render and the hydrated client.
 */
let mentionUid = 0;

/**
 * `@`-style mention picker for `<textarea>` and `<input>`. Listens for
 * trigger characters (default `'@'`); when typed at a word boundary, an
 * overlay panel opens at the caret and shows filtered options. Pick with
 * Enter / Tab / click — the trigger + query is replaced with the inserted
 * value plus a trailing space.
 *
 * @example
 * ```html
 * <textarea
 *   wrMention
 *   [wrMentionItems]="users"
 *   [displayWith]="userLabel"
 *   (wrMentionSelected)="onMention($event)"
 * ></textarea>
 * ```
 *
 * @see https://ngwr.dev/reference/components/mention
 */
@Directive({
  selector: '[wrMention]',
  host: {
    '(input)': 'onInput()',
    '(click)': 'onClick()',
    '(keyup)': 'onCaretMove($event)',
    '(keydown)': 'onKeydown($event)',
    '(blur)': 'onBlur()',

    // The host keeps its implicit `role="textbox"`. It is NOT a combobox: this
    // field holds prose and the mention is one fragment inside it, not the
    // field's value. `role="combobox"` is also flatly disallowed on `<textarea>`
    // by ARIA in HTML (axe: `aria-allowed-role`), and it would drop
    // `aria-multiline`, which combobox does not support — so a screen reader
    // would stop reporting the field as multi-line for the whole editing
    // session, not just while the popup is open.
    //
    // Static, because `aria-autocomplete` describes a permanent capability of
    // the field; ARIA says authors SHOULD NOT toggle it to signal that
    // suggestions are currently showing. Being static is also what makes the
    // feature discoverable — it is announced on focus, before the user types a
    // trigger char.
    'aria-autocomplete': 'list',
    // Required alongside `aria-autocomplete="list"`, and must name the popup's
    // role. Measured clean on a textbox with axe-core 4.13.
    'aria-haspopup': 'listbox',
    // Also static, and deliberately left pointing at an id that only exists
    // while the panel is open: gating it would mean gating `aria-autocomplete`
    // too. An unresolved `aria-controls` is a manual-review note in axe, never a
    // violation — unlike `aria-activedescendant`, which is an author error.
    //
    // This is the attribute that legalises the whole design: for a textbox
    // controlling a popup, `aria-activedescendant` is allowed to name an element
    // owned by the *controlled* element, which is how the reference reaches into
    // the CDK overlay's separate DOM subtree at all.
    '[attr.aria-controls]': 'listboxId',
    '[attr.aria-activedescendant]': 'activeOptionId()',

    // No `aria-expanded`. It is not a supported state of `role="textbox"` —
    // axe rates it a *critical* `aria-allowed-attr` violation — so the
    // "a list appeared" signal cannot be an ARIA state here. That is what the
    // live region below is for; it is load-bearing, not decoration.
  },
})
export class WrMention<T extends WrMentionItem = WrMentionItem> {
  /** Items to filter against the typed query. */
  readonly wrMentionItems = input<readonly T[]>([]);

  /** Trigger characters that open the panel. @default ['@'] */
  readonly triggers = input<readonly string[]>(['@']);

  /** Maps an item to its display label. @default `item.label` */
  readonly displayWith = input<(item: T) => string>((item: T) => item.label);

  /**
   * Returns the text to insert into the textarea on commit. Receives the
   * picked item and the trigger char. @default `${trigger}${displayWith(item)}`
   */
  readonly valueWith = input<((item: T, trigger: string) => string) | null>(null);

  /** Custom filter. @default case-insensitive `includes` over `displayWith(item)`. */
  readonly filterWith = input<((query: string, item: T) => boolean) | null>(null);

  /** Maximum number of items shown in the panel. @default 8 */
  readonly maxResults = input(8, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 8)) });

  /** Emits the selected item, trigger, and query whenever the user commits. */
  readonly wrMentionSelected = output<WrMentionCommit<T>>();

  private readonly host = inject<ElementRef<HTMLTextAreaElement | HTMLInputElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<WrMentionPanel> | null = null;
  private state: ActiveState | null = null;
  private readonly activeIndex = signal(0);
  private readonly filteredItems = signal<readonly T[]>([]);
  private readonly isOpen = signal(false);

  /** @internal — read by the `aria-controls` host binding. */
  protected readonly listboxId = `wr-mention-listbox-${++mentionUid}`;

  private readonly listLabel = readI18nText('mention.listbox', 'Mentions');
  private readonly availableText = useI18nFormatter('mention.available', 'Matches available: {{count}}');
  private readonly insertedText = useI18nFormatter('mention.inserted', 'Inserted: {{label}}');

  /**
   * `aria-activedescendant`, or `null`.
   *
   * Gated hard on `isOpen()`, which is only set once the panel's options are
   * actually in the DOM. An id that resolves to nothing is an author error, and
   * the failure mode is silent: the browser does not complain, it simply stops
   * firing the event that makes a screen reader speak the option. Same
   * discipline `tree.ts` uses for its virtualized rows.
   */
  protected readonly activeOptionId = computed<string | null>(() => {
    if (!this.isOpen()) return null;
    const index = this.activeIndex();
    return index >= 0 && index < this.filteredItems().length ? wrMentionOptionId(this.listboxId, index) : null;
  });

  /**
   * Polite live region, parked on `<body>`.
   *
   * Not inside the panel: `close()` disposes the overlay on every keystroke that
   * leaves a mention, so a region living there would be recreated constantly —
   * and a live region has to be in the DOM *before* its text changes to be
   * announced at all. It also could not announce the two cases that matter most,
   * since in both the panel is already gone: "nothing matched" and "inserted X".
   *
   * Not a sibling of the host either — that would land inside the consumer's
   * markup and start matching their `+`, `~` and `:nth-child()` selectors.
   */
  private liveRegion: HTMLElement | null = null;

  constructor() {
    if (this.isBrowser) {
      const doc = this.host.nativeElement.ownerDocument;
      const region = doc.createElement('div');
      region.className = 'wr-mention__status';
      region.setAttribute('role', 'status');
      doc.body.appendChild(region);
      this.liveRegion = region;
    }

    this.destroyRef.onDestroy(() => {
      this.close();
      this.liveRegion?.remove();
      this.liveRegion = null;
    });
  }

  private announce(message: string): void {
    if (this.liveRegion) this.liveRegion.textContent = message;
  }

  // Host listeners

  /** @internal */
  protected onInput(): void {
    this.detect();
  }

  /** @internal */
  protected onClick(): void {
    this.detect();
  }

  /** @internal */
  protected onCaretMove(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Tab') return;
    this.detect();
  }

  /** @internal */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.state) return;
    const list = this.filteredItems();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (list.length > 0) this.setActive((this.activeIndex() + 1) % list.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (list.length > 0) this.setActive((this.activeIndex() - 1 + list.length) % list.length);
        break;
      case 'Enter':
      case 'Tab': {
        const item = list[this.activeIndex()];
        if (item) {
          event.preventDefault();
          this.commit(item);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  }

  /** @internal */
  protected onBlur(): void {
    // Defer so option mousedown lands first.
    setTimeout(() => this.close(), 120);
  }

  // Detection

  private detect(): void {
    const el = this.host.nativeElement;
    const caret = el.selectionStart ?? 0;
    const text = el.value.substring(0, caret);
    const triggers = this.triggers();

    // Walk back from the caret looking for a trigger char with whitespace
    // (or start-of-string) immediately before it. Stop on whitespace.
    let i = caret;
    while (i > 0) {
      const ch = text[i - 1];
      if (triggers.includes(ch)) {
        const before = i - 2 >= 0 ? text[i - 2] : '';
        if (i - 2 < 0 || /\s/.test(before)) {
          const query = text.substring(i);
          this.activate(ch, query, i - 1);
          return;
        }
        break;
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    this.close();
  }

  private activate(trigger: string, query: string, startIndex: number): void {
    this.state = { trigger, query, startIndex };
    const previousCount = this.filteredItems().length;
    const filtered = this.filter(query).slice(0, this.maxResults());
    this.filteredItems.set(filtered);
    if (filtered.length === 0) {
      // Announce *after* closing: `close()` clears the region, so announcing
      // first would wipe the message before a screen reader reached it.
      this.close();
      this.announce(this.availableText({ count: 0 }));
      return;
    }
    this.setActive(Math.min(this.activeIndex(), filtered.length - 1));
    this.open();
    // Only when the size actually changes. Re-announcing the same count on every
    // keystroke would talk over the per-option speech from activedescendant.
    if (filtered.length !== previousCount) this.announce(this.availableText({ count: filtered.length }));
  }

  private filter(query: string): readonly T[] {
    const items = this.wrMentionItems();
    const custom = this.filterWith();
    const display = this.displayWith();
    if (!query) return items;
    if (custom) return items.filter(item => custom(query, item));
    const q = query.toLowerCase();
    return items.filter(item => display(item).toLowerCase().includes(q));
  }

  private setActive(i: number): void {
    this.activeIndex.set(i);
    this.panelRef?.setInput('activeIndex', i);
  }

  // Overlay

  private open(): void {
    const el = this.host.nativeElement;
    const caret = el.selectionStart ?? 0;
    const { top, left, lineHeight } = getCaretCoordinates(el, caret);
    const x = left;
    const y = top + lineHeight + 4;

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy: this.overlay.position().global().left(`${x}px`).top(`${y}px`),
        scrollStrategy: this.scrollStrategies.reposition(),
        panelClass: 'wr-mention-overlay',
      });

      const portal = new ComponentPortal(WrMentionPanel);
      const ref = this.overlayRef.attach(portal);
      this.panelRef = ref;
      ref.setInput('displayWith', this.displayWith());
      ref.setInput('listboxId', this.listboxId);
      ref.setInput('listLabel', this.listLabel);
      ref.instance.picked.subscribe(item => this.commit(item as T));
      ref.instance.hovered.subscribe(i => this.setActive(i));
    } else {
      this.overlayRef.updatePositionStrategy(this.overlay.position().global().left(`${x}px`).top(`${y}px`));
    }

    this.panelRef?.setInput('items', this.filteredItems());
    this.panelRef?.setInput('activeIndex', this.activeIndex());

    // Render the panel's own view NOW, before `aria-activedescendant` is allowed
    // to name one of its options. `attach()` inserts the host element but leaves
    // it empty — the panel is a separate root view, so on the first open the
    // `<li>` being referenced does not exist anywhere in the document yet.
    // Waiting for the next tick would leave a window where the reference dangles
    // and the announcement is lost with no error anywhere.
    this.panelRef?.changeDetectorRef.detectChanges();
    this.isOpen.set(true);
  }

  private close(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.panelRef = null;
    }
    this.isOpen.set(false);
    this.state = null;
    this.activeIndex.set(0);
    this.filteredItems.set([]);
    this.announce('');
  }

  private commit(item: T): void {
    // Snapshot the state up front. `dispatchEvent` below re-enters this directive
    // synchronously: the listener runs `detect()`, and because assigning
    // `el.value` has already parked the caret at the end of the text — past the
    // space this method appends — `detect()` finds no trigger and calls
    // `close()`, which nulls `this.state`. Reading `this.state` after that line
    // threw, so `wrMentionSelected` never fired for anyone.
    const state = this.state;
    if (!state) return;

    const el = this.host.nativeElement;
    const value = el.value;
    const caret = el.selectionStart ?? value.length;
    const valueFn = this.valueWith();
    const label = this.displayWith()(item);
    const inserted = valueFn ? valueFn(item, state.trigger) : `${state.trigger}${label}`;
    const replacement = `${inserted} `;
    const before = value.substring(0, state.startIndex);
    const after = value.substring(caret);
    const next = before + replacement + after;

    el.value = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const nextCaret = (before + replacement).length;
    el.setSelectionRange(nextCaret, nextCaret);
    this.wrMentionSelected.emit({ item, trigger: state.trigger, query: state.query });

    // Announce after `close()`, never before — it clears the live region.
    // Committing is otherwise silent: the panel simply vanishes.
    this.close();
    this.announce(this.insertedText({ label }));
  }
}
