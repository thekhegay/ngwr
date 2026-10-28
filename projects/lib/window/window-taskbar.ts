/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceNumberProperty } from '@angular/cdk/coercion';
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
  viewChild,
  viewChildren,
} from '@angular/core';

import { WrDropdown, WrDropdownItem, WrDropdownMenu } from 'ngwr/dropdown';
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
 * What the rail has to fit its tabs into, in px: the width inside its padding and
 * border, the gap between two buttons, the width of the "+N" button and the width
 * each window's tab takes at its own title, by window id. `null` where nothing is
 * laid out — on the server, in a hidden taskbar, under jsdom — and then only
 * `maxTabs` folds.
 */
interface Room {
  readonly width: number;
  readonly gap: number;
  readonly more: number;
  readonly tabs: ReadonlyMap<string, number>;
}

const sameTabs = (a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean =>
  a.size === b.size && [...a].every(([id, width]) => b.get(id) === width);

const sameRoom = (a: Room | null, b: Room | null): boolean =>
  a === b || (!!a && !!b && a.width === b.width && a.gap === b.gap && a.more === b.more && sameTabs(a.tabs, b.tabs));

/** `null` and an empty attribute leave the width to decide; any number keeps at least one tab. */
const maxTabsAttr = (value: unknown): number | null =>
  value === null || value === undefined || value === ''
    ? null
    : Math.max(1, Math.trunc(coerceNumberProperty(value, 1)));

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
 * The rail stays one row. A tab is as wide as its title, up to
 * `--wr-window-taskbar-tab-max-width`, and the tabs that do not fit — or every
 * one past `maxTabs` — fold under a "+N" button at the end, which opens them as
 * a menu. In `show="all"` the active window's tab is never folded.
 *
 * Windows opted out via `config.taskbar = false` never show up here.
 *
 * @example
 * ```html
 * <wr-window-taskbar />
 * <wr-window-taskbar position="top" />
 * <wr-window-taskbar show="all" />
 * <wr-window-taskbar show="all" [maxTabs]="6" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/window
 */
@Component({
  selector: 'wr-window-taskbar',
  templateUrl: './window-taskbar.html',
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
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
  /** @internal */ protected readonly moreLabel = useI18nFormatter('window.taskbarMore', 'More windows: {{count}}');

  /** Edge the taskbar pins itself to. @default 'bottom' */
  readonly position = input<'top' | 'bottom'>('bottom');

  /**
   * Which windows the rail lists: the minimized ones, or every open one with
   * the active window marked (since v15.1). @default 'minimized'
   */
  readonly show = input<WrWindowTaskbarShow>('minimized');

  /**
   * The most tabs the rail shows; the rest fold under a "+N" button that opens
   * them as a menu (since v15.1). The width folds tabs too, whatever this says:
   * the tabs that do not fit beside the button at their own width go under it.
   * `null` leaves it to the width alone.
   * @default null
   */
  readonly maxTabs = input<number | null, unknown>(null, { transform: maxTabsAttr });

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

  /** What the rail has to fit its tabs into — see {@link Room}. */
  private readonly room = signal<Room | null>(null, { equal: sameRoom });

  /**
   * The tabs the rail draws, in opening order: all of them while they fit and
   * `maxTabs` allows it, otherwise the most that fit beside the "+N" button,
   * never more than `maxTabs` and never fewer than one. The active window's tab
   * takes the last place when it would otherwise fold, so the one tab
   * `show="all"` marks is always in reach. A tab not measured yet counts as
   * nothing, and the pass after its first render corrects that.
   */
  protected readonly visible = computed(() => {
    const items = this.items();
    const max = this.maxTabs() ?? Infinity;
    const room = this.room();
    const fits = (shown: readonly AnyRef[], more: boolean): boolean => {
      if (room === null) return true;
      let need = Math.max(0, shown.length - 1) * room.gap + (more ? room.gap + room.more : 0);
      for (const ref of shown) need += room.tabs.get(ref.id) ?? 0;
      // No slack beyond float noise: a row the rail accepts must not overflow,
      // or its tabs squeeze and read differently the next pass.
      return need <= room.width + 0.01;
    };
    if (items.length <= max && fits(items, false)) return items;
    const current = items.find(ref => this.isCurrent(ref));
    const first = (count: number): AnyRef[] => {
      const shown = items.slice(0, count);
      if (current && !shown.includes(current)) shown[count - 1] = current;
      return shown;
    };
    for (let count = Math.min(max, items.length - 1); count > 1; count--) {
      const shown = first(count);
      if (fits(shown, true)) return shown;
    }
    return first(1);
  });

  /** @internal — each listed window's place among the drawn tabs, absent while it is folded. */
  protected readonly slots = computed(() => new Map(this.visible().map((ref, index) => [ref, index])));

  /** @internal — the windows under the "+N" button, in opening order. */
  protected readonly folded = computed(() => {
    const visible = this.visible();
    return this.items().filter(ref => !visible.includes(ref));
  });

  /** The "+N" menu opens away from the edge the rail is pinned to. */
  protected readonly menuPosition = computed(() => (this.position() === 'top' ? 'bottom-end' : 'top-end'));

  protected readonly classes = computed(() => `wr-window-taskbar wr-window-taskbar--${this.position()}`);

  /**
   * One row per entry of `items()`, in the same order. A folded window keeps its
   * tab, laid out but hidden, which is how the rail knows its width.
   */
  private readonly tabs = viewChildren<ElementRef<HTMLElement>>('tab');
  private readonly more = viewChild<ElementRef<HTMLButtonElement>>('more');

  /**
   * The rail's one Tab stop, as an index into its buttons: two per drawn tab,
   * restore then close, and the "+N" button last.
   */
  private readonly rovingIndex = signal(0);
  private readonly stop = computed(() => {
    const buttons = this.visible().length * 2 + (this.folded().length > 0 ? 1 : 0);
    return Math.max(0, Math.min(this.rovingIndex(), buttons - 1));
  });

  /** The strip of the viewport the rail covers while it shows tabs. */
  private readonly reserve = signal<{ readonly top: number; readonly bottom: number }>(NO_RESERVE, {
    equal: (a, b) => a.top === b.top && a.bottom === b.bottom,
  });

  constructor() {
    // So a window minimized with focus inside can hand it to its tab here, a
    // window closed from its tab knows the focus there was its own, and a
    // maximized window stops short of the rail.
    const unregister = this.manager._registerTaskbar({
      // A folded window's place in the rail is the "+N" button it sits under.
      tabFor: ref => {
        if (this.folded().includes(ref)) return this.more()?.nativeElement ?? null;
        const index = this.items().indexOf(ref);
        return index >= 0 ? (this.tabs()[index]?.nativeElement ?? null) : null;
      },
      settling: ref => {
        const room = this.room();
        const index = this.items().indexOf(ref);
        if (room === null || index < 0) return false;
        if (!room.tabs.has(ref.id)) return true;
        if (this.folded().includes(ref)) return !this.more();
        return !!this.tabs()[index]?.nativeElement.classList.contains('wr-window-taskbar__tab--folded');
      },
      contains: node => this.host.contains(node),
      reserve: this.reserve.asReadonly(),
    });
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(unregister);

    // After the render that adds or removes the rail or a tab, retitles a tab
    // or moves the rail to the other edge — and again whenever the host, the
    // rail or the viewport changes size, which is also how a late web font
    // reaches the widths.
    let observer: ResizeObserver | null = null;
    let observedRail: HTMLElement | null = null;
    afterRenderEffect(() => {
      for (const ref of this.items()) this.tabTitle(ref);
      void this.folded().length;
      this.position();
      const rail = this.host.querySelector<HTMLElement>('.wr-window-taskbar__rail');
      if (observer && rail !== observedRail) {
        if (observedRail) observer.unobserve(observedRail);
        if (rail) observer.observe(rail);
      }
      observedRail = rail;
      this.measure();
    });
    afterNextRender(() => {
      const measure = (): void => this.measure();
      observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
      observer?.observe(this.host);
      if (observedRail) observer?.observe(observedRail);
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
    return button >= 0 && button === this.stop() ? 0 : -1;
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

  /** A window picked from the "+N" menu: the menu closes and the window comes forward, as from its tab. */
  protected pick(ref: AnyRef, menu: WrDropdown): void {
    menu.close();
    this.press(ref);
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

  /** The drawn buttons in order — a folded tab's are hidden and out of the toolbar. */
  private buttons(): HTMLButtonElement[] {
    return [
      ...this.host.querySelectorAll<HTMLButtonElement>(
        '.wr-window-taskbar__tab:not(.wr-window-taskbar__tab--folded) button, .wr-window-taskbar__more'
      ),
    ];
  }

  private measure(): void {
    if (typeof window === 'undefined') return;
    this.measureRoom();
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

  /**
   * Read what the rail has to fit into. The host spans the viewport between its
   * insets, so its width is the most the rail can take, and the gap comes from
   * the stylesheet, so a consumer's hook is what the arithmetic uses.
   *
   * A tab's width is the one its title asks for, capped by its `max-width`. Every
   * tab is laid out, a folded one too, so each can be read — and a tab drawn
   * narrower than its title, squeezed as the only one left, is as wide as it is
   * plus the part of the title it clips. That keeps the reading the same however
   * the row is drawn, so a pass never feeds the next one a different answer.
   *
   * The "+N" button is measured once it is drawn — until then a tab's height
   * stands in for its width, and the next pass corrects it. That converges: a
   * wider button folds more, which can only keep its count's digits or add one.
   */
  private measureRoom(): void {
    const rail = this.host.querySelector<HTMLElement>('.wr-window-taskbar__rail');
    const items = this.items();
    const tabs = this.tabs().map(tab => tab.nativeElement);
    const width = this.host.clientWidth;
    if (!rail || tabs.length === 0 || width <= 0) {
      this.room.set(null);
      return;
    }
    // A render is on its way that will draw the tabs `items()` lists; measure that one.
    if (tabs.length !== items.length) return;
    const railStyle = getComputedStyle(rail);
    const px = (value: string): number => parseFloat(value) || 0;
    const inner =
      width -
      px(railStyle.paddingInlineStart) -
      px(railStyle.paddingInlineEnd) -
      px(railStyle.borderInlineStartWidth) -
      px(railStyle.borderInlineEndWidth);
    const widths = new Map<string, number>();
    tabs.forEach((tab, index) => {
      const width = tab.getBoundingClientRect().width;
      const cap = getComputedStyle(tab).maxWidth;
      // A cap that depends on the box it sits in — a percentage, a calc() with
      // one — resolves against the rail for a drawn tab and the host for a folded
      // one, so there is no width of the tab's own to recover: take it as drawn.
      const fixed = cap.endsWith('px');
      if (!fixed && cap !== 'none' && cap !== '') {
        widths.set(items[index].id, width);
        return;
      }
      // Scroll and client widths are whole pixels, so a clip of one is rounding,
      // not a title the tab is too narrow for.
      const title = tab.querySelector<HTMLElement>('.wr-window-taskbar__tab-title');
      const clipped = title ? title.scrollWidth - title.clientWidth : 0;
      const natural = width + (clipped > 1 ? clipped : 0);
      widths.set(items[index].id, fixed ? Math.min(natural, parseFloat(cap)) : natural);
    });
    const more = this.more()?.nativeElement.getBoundingClientRect().width ?? tabs[0].getBoundingClientRect().height;
    this.room.set({ width: inner, gap: px(railStyle.columnGap), more, tabs: widths });
  }
}
