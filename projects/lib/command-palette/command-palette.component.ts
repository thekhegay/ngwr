/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ConfigurableFocusTrap, ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { WrHotkeyService, type WrHotkeyHandle, type WrHotkeySpec } from 'ngwr/hotkey';
import { WrIconComponent } from 'ngwr/icon';

import type { WrCommandItem } from './types';

interface Bucket {
  readonly title: string | null;
  readonly items: readonly WrCommandItem[];
}

let listboxUid = 0;

function bucketize(items: readonly WrCommandItem[]): readonly Bucket[] {
  const map = new Map<string | null, WrCommandItem[]>();
  for (const item of items) {
    const key = item.group ?? null;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].map(([title, items]) => ({ title, items }));
}

function matches(item: WrCommandItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.description?.toLowerCase().includes(q)) return true;
  if (item.group?.toLowerCase().includes(q)) return true;
  if (item.keywords?.some(k => k.toLowerCase().includes(q))) return true;
  return false;
}

/**
 * `⌘K`-style command palette — a centred modal with a search input and
 * filtered list of actions. Items can be grouped, have icons, descriptions,
 * and visual shortcut hints.
 *
 * Drop one at the root of the app, pass it the list of commands, and bind
 * a global hotkey (default `'mod+k'`). Use `[(open)]` for controlled
 * visibility, or let it manage itself.
 *
 * @example
 * ```html
 * <wr-command-palette [items]="commands" trigger="mod+k" (picked)="onPicked($event)" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/command-palette
 */
@Component({
  selector: 'wr-command-palette',
  templateUrl: './command-palette.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrIconComponent],
})
export class WrCommandPaletteComponent {
  /** Items shown in the palette. */
  readonly items = input<readonly WrCommandItem[]>([]);

  /** Controlled open state (two-way bindable). @default false */
  readonly open = model(false);

  /** Global hotkey that opens the palette. `null` disables auto-binding. @default 'mod+k' */
  readonly trigger = input<WrHotkeySpec | null>('mod+k');

  /** Search input placeholder. @default 'Type a command or search…' */
  readonly placeholder = input<string>('Type a command or search…');

  /** Text shown when no items match. @default 'No results' */
  readonly emptyText = input<string>('No results');

  /** Auto-close on `(picked)`. Set false to keep open. @default true */
  readonly closeOnPick = input(true, { transform: coerceBooleanProperty });

  /** Fires when the user commits an item (Enter / click). */
  readonly picked = output<WrCommandItem>();

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);
  protected readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('input');
  protected readonly panelEl = viewChild<ElementRef<HTMLElement>>('panel');

  /** Listbox id (referenced by the input's `aria-controls`). */
  protected readonly listboxId = `wr-command-palette-listbox-${++listboxUid}`;

  /** @internal Build a stable option id for a given flat index. */
  protected optionId(i: number): string {
    return `${this.listboxId}-opt-${i}`;
  }

  /** Id of the active option for `aria-activedescendant`. */
  protected readonly activeOptionId = computed<string | null>(() => {
    const i = this.activeIndex();
    return i >= 0 && i < this.filtered().length ? this.optionId(i) : null;
  });

  private readonly hotkeys = inject(WrHotkeyService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private bindingHandle: WrHotkeyHandle | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;
  private previouslyFocused: HTMLElement | null = null;

  /** Flat filtered list — what keyboard navigation walks. */
  protected readonly filtered = computed<readonly WrCommandItem[]>(() =>
    this.items().filter(item => matches(item, this.query()))
  );

  /** Grouped view — what the template renders. */
  protected readonly buckets = computed<readonly Bucket[]>(() => bucketize(this.filtered()));

  constructor() {
    // Bind / re-bind the global trigger whenever the spec changes.
    effect(() => {
      this.bindingHandle?.unbind();
      const spec = this.trigger();
      if (!spec) return;
      this.bindingHandle = this.hotkeys.bind(spec, () => this.open.update(v => !v), { allowInInput: true });
    });

    // Reset query + active index whenever we open; focus the input.
    effect(() => {
      if (!this.open()) return;
      this.query.set('');
      this.activeIndex.set(0);
    });

    // Focus trap + restore.
    effect(() => {
      if (!this.isBrowser) return;
      if (this.open()) {
        const active = document.activeElement;
        this.previouslyFocused = active instanceof HTMLElement ? active : null;
        queueMicrotask(() => {
          const host = this.panelEl()?.nativeElement;
          if (!host) return;
          this.focusTrap?.destroy();
          this.focusTrap = this.focusTrapFactory.create(host);
          void this.focusTrap.focusInitialElementWhenReady();
        });
      } else {
        this.focusTrap?.destroy();
        this.focusTrap = null;
        const restore = this.previouslyFocused;
        this.previouslyFocused = null;
        if (restore && typeof restore.focus === 'function') restore.focus();
      }
    });

    afterNextRender(() => {
      if (this.open()) this.inputEl()?.nativeElement.focus();
    });

    // Auto-focus the input when opened.
    effect(() => {
      if (!this.open()) return;
      queueMicrotask(() => this.inputEl()?.nativeElement.focus());
    });

    // Clamp the active index when the filtered list shrinks.
    effect(() => {
      const max = Math.max(0, this.filtered().length - 1);
      if (this.activeIndex() > max) this.activeIndex.set(max);
    });

    this.destroyRef.onDestroy(() => this.bindingHandle?.unbind());
  }

  // ──────── Template handlers ────────

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const list = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (list.length > 0) this.activeIndex.set((this.activeIndex() + 1) % list.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (list.length > 0) this.activeIndex.set((this.activeIndex() - 1 + list.length) % list.length);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(Math.max(0, list.length - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const item = list[this.activeIndex()];
        if (item) this.commit(item);
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

  protected onBackdropClick(): void {
    this.close();
  }

  protected onItemClick(item: WrCommandItem, event: MouseEvent): void {
    event.preventDefault();
    this.commit(item);
  }

  protected onItemHover(item: WrCommandItem): void {
    const i = this.filtered().indexOf(item);
    if (i >= 0) this.activeIndex.set(i);
  }

  /** Flat index of an item within the filtered list — for highlight checks. */
  protected indexOf(item: WrCommandItem): number {
    return this.filtered().indexOf(item);
  }

  // ──────── Public API ────────

  /** Open the palette. */
  show(): void {
    this.open.set(true);
  }

  /** Close the palette. */
  close(): void {
    this.open.set(false);
  }

  // ──────── Internals ────────

  private commit(item: WrCommandItem): void {
    item.action?.();
    this.picked.emit(item);
    if (this.closeOnPick()) this.close();
  }
}
