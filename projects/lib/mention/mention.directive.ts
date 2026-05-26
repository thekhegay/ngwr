/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  type ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { WR_OVERLAY } from 'ngwr/overlay';

import { getCaretCoordinates } from './caret';
import { WrMentionPanelComponent } from './mention-panel.component';
import type { WrMentionCommit, WrMentionItem } from './types';

interface ActiveState {
  trigger: string;
  query: string;
  startIndex: number;
}

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
 * @see https://ngwr.dev/docs/components/mention
 */
@Directive({ selector: '[wrMention]' })
export class WrMentionDirective<T extends WrMentionItem = WrMentionItem> {
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

  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<WrMentionPanelComponent> | null = null;
  private state: ActiveState | null = null;
  private readonly activeIndex = signal(0);
  private readonly filteredItems = signal<readonly T[]>([]);

  constructor() {
    this.destroyRef.onDestroy(() => this.close());
  }

  // ──────── Host listeners ────────

  @HostListener('input')
  protected onInput(): void {
    this.detect();
  }

  @HostListener('click')
  protected onClick(): void {
    this.detect();
  }

  @HostListener('keyup', ['$event'])
  protected onCaretMove(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Tab') return;
    this.detect();
  }

  @HostListener('keydown', ['$event'])
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

  @HostListener('blur')
  protected onBlur(): void {
    // Defer so option mousedown lands first.
    setTimeout(() => this.close(), 120);
  }

  // ──────── Detection ────────

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
    const filtered = this.filter(query).slice(0, this.maxResults());
    this.filteredItems.set(filtered);
    if (filtered.length === 0) {
      this.close();
      return;
    }
    this.setActive(Math.min(this.activeIndex(), filtered.length - 1));
    this.open();
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

  // ──────── Overlay ────────

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

      const portal = new ComponentPortal(WrMentionPanelComponent);
      const ref = this.overlayRef.attach(portal);
      this.panelRef = ref;
      ref.setInput('displayWith', this.displayWith());
      ref.instance.picked.subscribe(item => this.commit(item as T));
      ref.instance.hovered.subscribe(i => this.setActive(i));
    } else {
      this.overlayRef.updatePositionStrategy(this.overlay.position().global().left(`${x}px`).top(`${y}px`));
    }

    this.panelRef?.setInput('items', this.filteredItems());
    this.panelRef?.setInput('activeIndex', this.activeIndex());
  }

  private close(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.panelRef = null;
    }
    this.state = null;
    this.activeIndex.set(0);
    this.filteredItems.set([]);
  }

  private commit(item: T): void {
    if (!this.state) return;
    const el = this.host.nativeElement;
    const value = el.value;
    const caret = el.selectionStart ?? value.length;
    const valueFn = this.valueWith();
    const inserted = valueFn ? valueFn(item, this.state.trigger) : `${this.state.trigger}${this.displayWith()(item)}`;
    const replacement = `${inserted} `;
    const before = value.substring(0, this.state.startIndex);
    const after = value.substring(caret);
    const next = before + replacement + after;
    el.value = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const nextCaret = (before + replacement).length;
    el.setSelectionRange(nextCaret, nextCaret);
    this.wrMentionSelected.emit({ item, trigger: this.state.trigger, query: this.state.query });
    this.close();
  }
}
