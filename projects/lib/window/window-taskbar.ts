/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';

import { WrWindowManager } from './services/window-manager';
import type { WrWindowTaskbarShow } from './types';
import type { WrWindowRef } from './window-ref';

type AnyRef = WrWindowRef<unknown, unknown>;

/**
 * Stands in for the consumer input `useI18nText` expects — the taskbar exposes no
 * label inputs. Read reactively rather than once at construction: the rail is as
 * long-lived as the app, so a catalog that arrives later, or a locale switch, has to
 * reach it.
 */
const NO_OVERRIDE = signal<string | null>(null).asReadonly();

const NO_RESERVE = { top: 0, bottom: 0 } as const;

/**
 * OS-style window taskbar. Drop one anywhere in the app — typically
 * fixed to the bottom of the viewport — and it lists the windows
 * `WrWindowManager.open()` has handed out: the minimized ones by default,
 * every open one with `show="all"`. Clicking a tab switches to its window;
 * with `show="all"`, clicking the active window's tab minimizes it. The close
 * glyph dismisses a window without restoring it.
 *
 * The rail is one Tab stop, a toolbar: the arrow keys move between its
 * buttons, Home and End jump to the ends.
 *
 * Focus follows the window in and out of the rail: minimizing a window
 * that holds focus puts focus on its tab here, and restoring it from the
 * tab moves focus into the window.
 *
 * While it shows tabs, the rail reserves its strip of the viewport, so a
 * maximized or snapped window stops short of it.
 *
 * Windows opted out via `config.taskbar = false` never show up here.
 *
 * @example
 * ```html
 * <wr-window-taskbar />
 * <wr-window-taskbar position="top" />
 * <wr-window-taskbar show="all" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/window
 */
@Component({
  selector: 'wr-window-taskbar',
  templateUrl: './window-taskbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'toolbar',
    '[attr.aria-label]': 'railLabel()',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
  },
})
export class WrWindowTaskbar {
  // Four English literals lived in this component's markup, next to a catalog that
  // already carried `window.close`. A `toolbar` with no name and tabs announced in
  // the wrong language are both invisible on screen.
  private readonly minimizedLabel = useI18nText(NO_OVERRIDE, 'window.taskbar', 'Minimized windows');
  private readonly allLabel = useI18nText(NO_OVERRIDE, 'window.taskbarAll', 'Open windows');
  /** @internal */ protected readonly closeLabel = useI18nText(NO_OVERRIDE, 'window.closeWindow', 'Close window');
  /** @internal */ protected readonly untitled = useI18nText(NO_OVERRIDE, 'window.untitled', 'Untitled');
  /** @internal */ protected readonly restoreLabel = useI18nFormatter('window.restoreWindow', 'Restore {{title}}');

  /** Edge the taskbar pins itself to. @default 'bottom' */
  readonly position = input<'top' | 'bottom'>('bottom');

  /**
   * Which windows the rail lists: the minimized ones, or every open one with
   * the active window marked (since v15.1). @default 'minimized'
   */
  readonly show = input<WrWindowTaskbarShow>('minimized');

  private readonly manager = inject(WrWindowManager);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly dir = inject(Directionality, { optional: true });

  /** @internal */ protected readonly railLabel = computed(() =>
    this.show() === 'all' ? this.allLabel() : this.minimizedLabel()
  );

  /** @internal — the windows the rail lists, in the order they opened. */
  protected readonly items = computed(() =>
    this.show() === 'all' ? this.manager.windows().filter(w => w.taskbarVisible) : this.manager.minimized()
  );

  protected readonly classes = computed(() => `wr-window-taskbar wr-window-taskbar--${this.position()}`);

  /** One row per entry of `items()`, in the same order. */
  private readonly tabs = viewChildren<ElementRef<HTMLElement>>('tab');

  /** The rail's one Tab stop, as an index into its buttons: two per tab, restore then close. */
  private readonly rovingIndex = signal(0);
  private readonly stop = computed(() => Math.max(0, Math.min(this.rovingIndex(), this.items().length * 2 - 1)));

  /** The strip of the viewport the rail covers while it shows tabs. */
  private readonly reserve = signal<{ readonly top: number; readonly bottom: number }>(NO_RESERVE, {
    equal: (a, b) => a.top === b.top && a.bottom === b.bottom,
  });

  constructor() {
    // So a window minimized with focus inside can hand it to its tab here, a
    // window closed from its tab knows the focus there was its own, and a
    // maximized window stops short of the rail.
    const unregister = this.manager._registerTaskbar({
      tabFor: ref => {
        const index = this.items().indexOf(ref);
        return index < 0 ? null : (this.tabs()[index]?.nativeElement ?? null);
      },
      contains: node => this.host.contains(node),
      reserve: this.reserve.asReadonly(),
    });
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(unregister);

    // After the render that adds or removes the rail, or moves it to the
    // other edge — and again whenever its box or the viewport changes size.
    afterRenderEffect(() => {
      void this.items().length;
      this.position();
      this.measure();
    });
    afterNextRender(() => {
      const measure = (): void => this.measure();
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
      observer?.observe(this.host);
      window.addEventListener('resize', measure, { passive: true });
      destroyRef.onDestroy(() => {
        observer?.disconnect();
        window.removeEventListener('resize', measure);
      });
    });
  }

  /** A window with no title still needs a name in the rail. */
  protected tabTitle(ref: AnyRef): string {
    return ref.title() || this.untitled();
  }

  /** Whether `ref` is the active window and on screen — what `show="all"` marks. */
  protected isCurrent(ref: AnyRef): boolean {
    return ref.isActive() && ref.state() !== 'minimized';
  }

  /** A minimized window's tab restores it; in `show="all"` the others' tabs switch to their window. */
  protected tabLabel(ref: AnyRef): string {
    const title = this.tabTitle(ref);
    return this.show() === 'all' && ref.state() !== 'minimized' ? title : this.restoreLabel({ title });
  }

  protected tabIndex(button: number): number {
    return button === this.stop() ? 0 : -1;
  }

  protected press(ref: AnyRef): void {
    // The active window's own tab minimizes it, as on every desktop taskbar.
    // Focus is on this tab, not in the window, so it stays here.
    if (this.show() === 'all' && this.isCurrent(ref)) {
      ref.minimize();
      return;
    }
    // Back from the taskbar in the state it was minimized from, raised, and
    // focused on the control it had last — the tab this was pressed on may be
    // about to leave the rail, which would drop focus on `<body>`.
    ref.activate();
  }

  protected close(ref: AnyRef, event: Event): void {
    event.stopPropagation();
    void ref.close();
  }

  /** The toolbar pattern: arrows between buttons, Home and End to the ends, mirrored in RTL. */
  protected onKeydown(event: KeyboardEvent): void {
    const buttons = this.buttons();
    if (buttons.length === 0) return;
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    const rtl = this.dir?.value === 'rtl';
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = current + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        next = current + (rtl ? 1 : -1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    next = (next + buttons.length) % buttons.length;
    this.rovingIndex.set(next);
    buttons[next].focus();
  }

  /** A click or a script that focuses a button moves the Tab stop with it. */
  protected onFocusIn(event: FocusEvent): void {
    const index = this.buttons().indexOf(event.target as HTMLButtonElement);
    if (index >= 0) this.rovingIndex.set(index);
  }

  private buttons(): HTMLButtonElement[] {
    return [...this.host.querySelectorAll<HTMLButtonElement>('.wr-window-taskbar__rail button')];
  }

  private measure(): void {
    if (typeof window === 'undefined') return;
    const rect = this.host.getBoundingClientRect();
    if (rect.height <= 0) {
      this.reserve.set(NO_RESERVE);
      return;
    }
    const vh = document.documentElement.clientHeight || window.innerHeight;
    this.reserve.set(
      this.position() === 'top'
        ? { top: Math.ceil(rect.bottom), bottom: 0 }
        : { top: 0, bottom: Math.max(0, Math.ceil(vh - rect.top)) }
    );
  }
}
