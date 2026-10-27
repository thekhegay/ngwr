/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { FocusTrapFactory } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import type { ComponentType } from '@angular/cdk/portal';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  type Injector,
  type OnInit,
  TemplateRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { randomId } from 'ngwr/utils';

import { WrWindowManager } from './services/window-manager';
import type { WrWindowResolvedOs, WrWindowSlotContent, WrWindowSlotContext, WrWindowSnapTarget } from './types';
import type { WrWindowKeyboardMode, WrWindowModel } from './window-model';
import type { WrWindowRef } from './window-ref';

/**
 * Stands in for the consumer input `useI18nText` expects. The chrome buttons take no
 * label input — they are icon-only OS affordances — but their names still have to
 * come from the catalog rather than from the template, which is where they used to
 * live as English literals.
 */
const NO_OVERRIDE = signal<string | null>(null).asReadonly();

/**
 * Best-effort OS detection — runs once at module load. Looks at the
 * new `navigator.userAgentData.platform` first (Chromium, no UA
 * sniffing required), falls back to `navigator.platform` /
 * `navigator.userAgent`. SSR-safe — returns `'windows'` when there's
 * no `window`.
 */
function detectOs(): WrWindowResolvedOs {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'windows';

  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
  // First non-empty source — `??` alone would keep an empty platform
  // string and skip the user-agent fallback.
  const candidates = [uaData?.platform, navigator.platform, navigator.userAgent];
  const platform = (candidates.find(v => !!v) ?? '').toLowerCase();
  if (
    platform.includes('mac') ||
    platform.includes('darwin') ||
    platform.includes('iphone') ||
    platform.includes('ipad')
  ) {
    return 'macos';
  }
  if (platform.includes('linux') || platform.includes('x11') || platform.includes('cros')) return 'linux';
  return 'windows';
}

const DETECTED_OS = detectOs();

/** How close to an edge of the work area the pointer has to be to snap there. */
const SNAP_HOT_ZONE = 12;

/** How far a drag on a maximized or snapped window travels before the window restores under it. */
const DRAG_THRESHOLD = 4;

/**
 * What never starts a drag, even inside a `dragHandle`: a press on a control is
 * for the control. Checked only up to the window's own element.
 */
const INTERACTIVE =
  'button, input, select, textarea, a[href], label, [contenteditable]:not([contenteditable="false"]), ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="radio"], [role="slider"], ' +
  '[role="spinbutton"], [role="textbox"], [role="combobox"], [role="tab"], [role="menuitem"], [role="option"]';

interface Edges {
  readonly t?: boolean;
  readonly r?: boolean;
  readonly b?: boolean;
  readonly l?: boolean;
}

function asTemplate(content: WrWindowSlotContent | null): TemplateRef<WrWindowSlotContext> | null {
  return content instanceof TemplateRef ? content : null;
}

function asComponent(content: WrWindowSlotContent | null): ComponentType<unknown> | null {
  return content && !(content instanceof TemplateRef) ? content : null;
}

/**
 * Internal rendering primitive for a single floating window.
 *
 * Not part of the public API — windows are opened through
 * `WrWindowManager.open(Component, config)`, which creates the window's
 * `WrWindowModel` and portals this component to draw it. Every state and
 * geometry change goes through the model; this component turns pointer and
 * key events into calls on it and owns the DOM-only parts: focus and the live
 * region.
 *
 * @internal
 */
@Component({
  selector: 'wr-window',
  templateUrl: './window.html',
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, NgComponentOutlet],
  host: {
    role: 'dialog',
    // Focusable by script, never by Tab: it is where focus lands when the
    // window opens with no control in its body, and it is what a click on the
    // window's own surface focuses, so the window the user is in is the one
    // `WrWindowManager` hands Escape to.
    tabindex: '-1',
    '[class]': 'classes()',
    '[style.left.px]': 'rect().left',
    '[style.top.px]': 'rect().top',
    '[style.width.px]': 'rect().width',
    '[style.height.px]': 'rect().height',
    '[style.z-index]': 'model().z()',
    '[attr.aria-labelledby]': 'titleId',
    '(pointerdown)': 'onPointerDown($event)',
    '(dblclick)': 'onBodyDblClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class WrWindow implements OnInit {
  /** The window's state and geometry. */
  readonly model = input.required<WrWindowModel>();
  /** The ref, handed to slot templates as `$implicit` and to the manager on activation. */
  readonly windowRef = input<WrWindowRef<unknown, unknown> | null>(null);
  /** The window's injector — what a slot component resolves `WR_WINDOW_REF` from. */
  readonly injector = input<Injector | undefined>(undefined);
  /** Content for the title bar, between the title and the buttons. */
  readonly titleExtra = input<WrWindowSlotContent | null>(null);
  /** Content for the status bar. */
  readonly statusBar = input<WrWindowSlotContent | null>(null);

  /**
   * A REQUEST to close, not the close itself. `WrWindowContainer` binds
   * `(closed)` to `WrWindowRef.close()`, which awaits the `beforeClose` hook and
   * — only if the hook agrees — disposes the overlay, so the owner is what takes
   * the window away and this component never has to hide itself.
   */
  readonly closed = output<void>();

  /** Auto-generated id for the title element, referenced by `aria-labelledby`. */
  protected readonly titleId = randomId('wr-window-title');

  // `window.close` had been sitting in both catalogs unread while the template
  // hard-coded the same English beside it; the other four had no key at all, so a
  // Russian app announced four of its five window buttons in English.
  protected readonly closeLabel = useI18nText(NO_OVERRIDE, 'window.close', 'Close');
  private readonly minimizeLabel = useI18nText(NO_OVERRIDE, 'window.minimize', 'Minimize');
  private readonly maximizeLabel = useI18nText(NO_OVERRIDE, 'window.maximize', 'Maximize');
  private readonly restoreLabel = useI18nText(NO_OVERRIDE, 'window.restore', 'Restore');
  private readonly restoreDownLabel = useI18nText(NO_OVERRIDE, 'window.restoreDown', 'Restore down');
  // The taskbar has named an untitled window this way since v13; the window
  // itself announced an empty name — `aria-labelledby` pointing at nothing.
  private readonly untitled = useI18nText(NO_OVERRIDE, 'window.untitled', 'Untitled');
  private readonly moveModeText = useI18nText(
    NO_OVERRIDE,
    'window.moveMode',
    'Moving the window. Use the arrow keys, Enter to finish, Escape to cancel.'
  );
  private readonly resizeModeText = useI18nText(
    NO_OVERRIDE,
    'window.resizeMode',
    'Resizing the window. Use the arrow keys, Enter to finish, Escape to cancel.'
  );
  private readonly movedText = useI18nFormatter('window.moved', 'Window moved to {{x}}, {{y}}');
  private readonly resizedText = useI18nFormatter('window.resized', 'Window resized to {{width}} by {{height}}');

  private readonly manager = inject(WrWindowManager);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusTraps = inject(FocusTrapFactory);
  private readonly dir = inject(Directionality, { optional: true });

  /** Ends the pointer move in progress, if any: its listeners are on the document. */
  private endMove: (() => void) | null = null;

  constructor() {
    // A window closed in the middle of a drag (a shortcut, the app) must not
    // leave its listeners on the document, writing to a model nobody draws.
    inject(DestroyRef).onDestroy(() => this.endMove?.());
  }

  /** What the live region says: written by the keyboard modes only. */
  protected readonly announcement = signal('');

  /** The control focus was on last, so switching back to the window lands there. */
  private lastFocused: HTMLElement | null = null;

  protected readonly state = computed(() => this.model().state());
  protected readonly rect = computed(() => this.model().rect());
  private readonly options = computed(() => this.model().options());

  protected readonly displayTitle = computed(() => this.model().title() || this.untitled());

  /** Resolved OS — `auto` → detected platform. */
  readonly resolvedOs = computed<WrWindowResolvedOs>(() => {
    const os = this.options().os;
    return os === 'auto' ? DETECTED_OS : os;
  });

  /**
   * Whether each control is rendered: the option wins, the chrome decides the
   * default. Linux is close-only unless asked otherwise. Minimize does NOT hang
   * on a `<wr-window-taskbar>` being on the page: an app may list minimized
   * windows in a dock of its own from `WrWindowManager.minimized()`, and the
   * macOS chrome never drops a light.
   */
  protected readonly minimizeVisible = computed(() => this.options().showMinimize ?? this.resolvedOs() !== 'linux');
  protected readonly maximizeVisible = computed(() => this.options().showMaximize ?? this.resolvedOs() !== 'linux');
  protected readonly showClose = computed(() => this.options().showClose);

  /**
   * How many caption buttons are drawn. The macOS chrome centres its title on
   * the whole bar by padding it as wide as the cluster on the other side, and a
   * window without one of the lights has a narrower cluster.
   */
  protected readonly actionCount = computed(
    () => Number(this.minimizeVisible()) + Number(this.maximizeVisible()) + Number(this.showClose())
  );

  /** The minimize button doubles as restore, and says which it is. */
  protected readonly minimizeActionLabel = computed(() =>
    this.state() === 'minimized' ? this.restoreLabel() : this.minimizeLabel()
  );

  /** Same for maximize, whose restore has its own wording. */
  protected readonly maximizeActionLabel = computed(() =>
    this.state() === 'maximized' ? this.restoreDownLabel() : this.maximizeLabel()
  );

  protected readonly resizeHandles = computed(() => this.options().resizable && this.state() === 'normal');

  protected readonly classes = computed(() => {
    const model = this.model();
    const parts = [
      'wr-window',
      `wr-window--${this.state()}`,
      `wr-window--os-${this.resolvedOs()}`,
      `wr-window--chrome-${this.options().chromeSize}`,
      model.isActive() ? 'wr-window--active' : 'wr-window--inactive',
    ];
    if (this.resizeHandles()) parts.push('wr-window--resizable');
    if (!this.options().animations) parts.push('wr-window--no-anim');
    const mode = model.keyboardMode();
    if (mode) parts.push(mode === 'move' ? 'wr-window--keyboard-moving' : 'wr-window--keyboard-resizing');
    return parts.join(' ');
  });

  protected readonly titleExtraTemplate = computed(() => asTemplate(this.titleExtra()));
  protected readonly titleExtraComponent = computed(() => asComponent(this.titleExtra()));
  protected readonly statusBarTemplate = computed(() => asTemplate(this.statusBar()));
  protected readonly statusBarComponent = computed(() => asComponent(this.statusBar()));
  protected readonly slotContext = computed<WrWindowSlotContext | null>(() => {
    const ref = this.windowRef();
    return ref ? { $implicit: ref } : null;
  });

  ngOnInit(): void {
    this.model().element = this.elRef.nativeElement;
  }

  // Chrome actions

  protected close(): void {
    this.closed.emit();
  }

  protected minimize(): void {
    this.model().minimize();
  }

  protected maximize(): void {
    this.model().maximize();
  }

  // Focus

  /**
   * Move focus into the window: to `[cdkFocusInitial]` or the first control in
   * its body — the CDK's rule, the one `WrDialog` and `WrDrawer` follow — else
   * to the window itself. The chrome buttons are not candidates: landing on
   * Close, the first of them on macOS, is the one place a window must not open
   * onto. Called after a render, by the container.
   *
   * @internal
   */
  focusInitial(): void {
    const host = this.elRef.nativeElement;
    if (!host.isConnected || this.state() === 'minimized') return;
    const body = host.querySelector<HTMLElement>('.wr-window__body');
    if (body) {
      // `deferAnchors`: no anchors go into the page, and nothing is trapped.
      const finder = this.focusTraps.create(body, true);
      const moved = finder.focusInitialElement({ preventScroll: true });
      finder.destroy();
      if (moved) return;
    }
    host.focus({ preventScroll: true });
  }

  /**
   * Move focus back to the control the window had last, the way a desktop
   * returns to a window — its first control when it never had one, or when that
   * one is gone or disabled.
   *
   * @internal
   */
  focusLast(): void {
    const host = this.elRef.nativeElement;
    if (!host.isConnected || this.state() === 'minimized') return;
    const last = this.lastFocused;
    if (last?.isConnected && host.contains(last)) {
      last.focus({ preventScroll: true });
      if (host.ownerDocument.activeElement === last) return;
    }
    this.focusInitial();
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target === this.elRef.nativeElement) return;
    // Not the chrome buttons: a click on minimize focuses it, and coming back
    // from the taskbar onto the minimize button is not coming back to the window.
    if (target.closest('.wr-window__chrome-action')) return;
    this.lastFocused = target;
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    // Focus leaving the window ends keyboard move or resize where it is, the
    // same as Enter: a mode that outlived its focus would steal the arrow keys
    // the next time the user came back.
    if (this.model().keyboardMode() && !(next instanceof Node && this.elRef.nativeElement.contains(next))) {
      this.commitKeyboard();
    }
  }

  // Pointer

  /**
   * Every press inside the window activates it. A press on a grab area — the
   * title bar, or a `dragHandle` — also starts a move, and moves focus into the
   * window itself: the move's `preventDefault()` stops the browser doing it, and
   * left alone the window the user just clicked to the front was not the one
   * that had the keyboard, so Escape closed the window behind it.
   */
  protected onPointerDown(event: PointerEvent): void {
    const model = this.model();
    if (model.keyboardMode()) this.commitKeyboard();
    const target = event.target instanceof Element ? event.target : null;
    const primary = event.button === 0;
    const grab = primary && !!target && this.isGrabArea(target);
    // A minimized window is `display: none`, so a press cannot reach it in a
    // browser; a synthetic one must not bring it back either.
    if (model.state() === 'minimized') return;
    const ref = this.windowRef();
    if (ref) this.manager._activate(ref, { focus: grab });
    if (grab) this.startMove(event);
  }

  /** Whether a press on `target` should start a move. */
  private isGrabArea(target: Element): boolean {
    const host = this.elRef.nativeElement;
    if (target.closest('.wr-window__chrome-action, .wr-window__handle')) return false;
    const control = target.closest(INTERACTIVE);
    if (control && host.contains(control)) return false;
    const handle = this.options().dragHandle;
    if (handle) {
      const match = target.closest(handle);
      return !!match && host.contains(match);
    }
    return !!target.closest('.wr-window__chrome');
  }

  /**
   * Where a double-click toggles maximize: the title bar, whatever `dragHandle`
   * says — on every desktop the bar maximizes even where it does not drag — and
   * any other grab area. Never a control or a caption button.
   */
  private isDblClickArea(target: Element): boolean {
    const host = this.elRef.nativeElement;
    if (target.closest('.wr-window__chrome-action, .wr-window__handle')) return false;
    const control = target.closest(INTERACTIVE);
    if (control && host.contains(control)) return false;
    const chrome = target.closest('.wr-window__chrome');
    return (!!chrome && host.contains(chrome)) || this.isGrabArea(target);
  }

  /**
   * Move the window with the pointer. The listeners go on the DOCUMENT and
   * pointer capture is taken only once the press has travelled past the drag
   * threshold, and then on the element that was pressed, never on the window.
   * Chromium sends `click` and `dblclick` to the capturing element, so a
   * capture taken on the window at press time sent every click in the title
   * bar to the window instead: the double-click that maximizes stopped
   * working, and a clickable badge in `titleExtra` never heard its click. A
   * press that stays put now keeps both, and a real drag swallows the click it
   * would otherwise end in, so dragging by a badge does not also press it.
   */
  private startMove(event: PointerEvent): void {
    const model = this.model();
    const o = model.options();
    const state = model.state();
    if (!o.movable || state === 'minimized') return;
    if (state === 'maximized' && !o.restoreOnDrag) return;
    event.preventDefault();
    this.endMove?.();
    const host = this.elRef.nativeElement;
    const doc = host.ownerDocument;
    const pressed = event.target instanceof Element ? event.target : host;
    const pointerId = event.pointerId;

    const originX = event.clientX;
    const originY = event.clientY;
    const start = model.rect();
    // A maximized or snapped window does not move until the drag has gone
    // somewhere: a click or a double-click on its title bar must not restore it.
    let detached = state === 'normal' && !model.snap();
    if (!detached && !o.restoreOnDrag) {
      model.unsnapInPlace();
      detached = true;
    }
    let startX = model.x();
    let startY = model.y();
    /** Past the threshold: a drag rather than a click, from here on. */
    let dragging = false;

    const move = (e: PointerEvent): void => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;
      if (!dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        dragging = true;
        // Keeps the moves coming over an iframe in the body. Optional, since
        // jsdom implements no pointer capture, and guarded, since a synthetic
        // pointer the browser never saw is refused with a `NotFoundError`.
        try {
          pressed.setPointerCapture?.(pointerId);
        } catch {
          // The document listeners carry the drag without it.
        }
      }
      if (!detached) {
        if (!dragging) return;
        // Restore the window's own size under the pointer, keeping the grab
        // point at the same fraction of the bar — what Windows, macOS and GNOME
        // all do. The snapped or maximized size was never the window's own.
        const fraction = start.width > 0 ? (originX - start.left) / start.width : 0.5;
        model.restore();
        startX = originX - fraction * model.width();
        startY = start.top;
        detached = true;
      }
      model.setRaw({ x: startX + dx, y: startY + dy });
      model.clamp();
      model.dragTarget.set(this.detectSnapTarget(e.clientX, e.clientY));
    };
    const stop = (): void => {
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', end);
      doc.removeEventListener('pointercancel', end);
      if (dragging && pressed.hasPointerCapture?.(pointerId)) pressed.releasePointerCapture?.(pointerId);
      model.dragTarget.set(null);
      this.endMove = null;
    };
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== pointerId) return;
      const snap = model.dragTarget();
      stop();
      if (dragging) this.swallowClick(doc, pressed);
      if (!detached) return;
      if (snap) {
        model.snapTo(snap);
        if (snap !== 'top') model.resized.next({ width: model.rect().width, height: model.rect().height });
      }
      // `moved` is where the USER put the window, so a press that never moved
      // it — a click, either half of a double-click — says nothing.
      const r = model.rect();
      if (snap || r.left !== start.left || r.top !== start.top) model.moved.next({ x: r.left, y: r.top });
    };

    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', end);
    // `pointercancel` is never followed by a `pointerup` (a pen leaving range, a
    // long-press menu, an OS gesture taking over), so without this the move
    // listener outlived the drag: every later hover dragged the window. The
    // cancelled gesture's geometry is kept rather than rolled back.
    doc.addEventListener('pointercancel', end);
    this.endMove = stop;
  }

  /**
   * Eat the `click` a drag ends in. The browser dispatches it straight after the
   * `pointerup`, in the same task, at the element holding capture — the one the
   * drag started on — so the listener takes only a click there, and is taken
   * away at the next task rather than left to eat a real one.
   */
  private swallowClick(doc: Document, pressed: Element): void {
    const swallow = (e: Event): void => {
      if (e.target !== pressed) return;
      doc.removeEventListener('click', swallow, true);
      e.stopPropagation();
      e.preventDefault();
    };
    doc.addEventListener('click', swallow, true);
    setTimeout(() => doc.removeEventListener('click', swallow, true));
  }

  /** Map a pointer position to a snap target, honouring the `snap` option and the work area. */
  private detectSnapTarget(clientX: number, clientY: number): WrWindowSnapTarget | null {
    const model = this.model();
    const mode = model.options().snap;
    if (mode === 'none') return null;
    const wa = model.workArea();
    const nearLeft = clientX <= wa.left + SNAP_HOT_ZONE;
    const nearRight = clientX >= wa.left + wa.width - SNAP_HOT_ZONE;
    const nearTop = clientY <= wa.top + SNAP_HOT_ZONE;
    const nearBottom = clientY >= wa.top + wa.height - SNAP_HOT_ZONE;
    if (mode === 'all') {
      if (nearTop && nearLeft) return 'top-left';
      if (nearTop && nearRight) return 'top-right';
      if (nearBottom && nearLeft) return 'bottom-left';
      if (nearBottom && nearRight) return 'bottom-right';
    }
    if (nearTop) return 'top'; // top edge → maximise
    if (nearLeft) return 'left';
    if (nearRight) return 'right';
    return null;
  }

  /**
   * A double-click on the title bar maximizes, or restores a maximized or
   * snapped window. Bound on the bar itself rather than only on the host, so a
   * `dblclick` that does not bubble — which is what a harness dispatches — still
   * reaches it.
   *
   * The gate is `showMaximize !== false`, NOT `maximizeVisible()`, and the
   * difference is a window nobody can get out of: the Linux preset hides the
   * maximize BUTTON, but the gesture is how GNOME maximizes, and `maximized` is
   * reachable there with no button at all (a snap to the top edge,
   * `ref.maximize()`, a restored layout). An explicit `showMaximize: false`
   * still turns the gesture off everywhere.
   */
  protected onChromeDblClick(event: MouseEvent): void {
    this.toggleFromDblClick(event.target);
  }

  /**
   * The same gesture on a body `dragHandle`, which answers it the way the title
   * bar does. A double-click in the bar bubbles here too and is the bar's.
   */
  protected onBodyDblClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest('.wr-window__chrome')) return;
    this.toggleFromDblClick(target);
  }

  private toggleFromDblClick(target: EventTarget | null): void {
    // Double-clicking the maximize BUTTON is two clicks on it already; the
    // chrome toggling a third time left the window maximized. A button in
    // `titleExtra` is the same: two presses of it, not a gesture on the bar.
    if (!(target instanceof Element) || !this.isDblClickArea(target)) return;
    const model = this.model();
    if (model.state() === 'minimized') return;
    if (model.state() === 'normal' && model.snap()) {
      model.restore();
      return;
    }
    if (model.options().showMaximize !== false) model.maximize();
  }

  protected startResize(event: PointerEvent, edges: Edges): void {
    const model = this.model();
    if (!model.options().resizable || model.state() !== 'normal') return;
    event.preventDefault();
    event.stopPropagation();
    if (model.keyboardMode()) this.commitKeyboard();
    const ref = this.windowRef();
    if (ref) this.manager._activate(ref, { focus: true });
    model.unsnapInPlace();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture?.(event.pointerId);

    const startX = model.x();
    const startY = model.y();
    const startW = model.width();
    const startH = model.height();
    const originX = event.clientX;
    const originY = event.clientY;

    const move = (e: PointerEvent): void => {
      const o = model.options();
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;

      let nextX = startX;
      let nextY = startY;
      let nextW = startW;
      let nextH = startH;

      if (edges.r) nextW = startW + dx;
      if (edges.b) nextH = startH + dy;
      if (edges.l) {
        nextW = startW - dx;
        nextX = startX + dx;
      }
      if (edges.t) {
        nextH = startH - dy;
        nextY = startY + dy;
      }

      // Enforce min/max — when shrinking from left/top we have to fix the position too.
      const clampedW = Math.min(o.maxWidth, Math.max(o.minWidth, nextW));
      const clampedH = Math.min(o.maxHeight, Math.max(o.minHeight, nextH));
      if (edges.l) nextX += nextW - clampedW;
      if (edges.t) nextY += nextH - clampedH;

      model.setRaw({ x: nextX, y: nextY, width: clampedW, height: clampedH });
      model.clamp();
    };
    const cleanup = (e: PointerEvent): void => {
      target.releasePointerCapture?.(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', cleanup);
      target.removeEventListener('pointercancel', cleanup);
      model.resized.next({ width: model.width(), height: model.height() });
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', cleanup);
    // Same cancelled-gesture leak as `startMove` — a resize handle that is
    // still listening for `pointermove` resizes the window on a bare hover.
    target.addEventListener('pointercancel', cleanup);
  }

  // Bound resize handlers for the template — avoids inline object literals
  // re-creating on every change-detection tick.
  protected resizeTL = (e: PointerEvent): void => this.startResize(e, { t: true, l: true });
  protected resizeT = (e: PointerEvent): void => this.startResize(e, { t: true });
  protected resizeTR = (e: PointerEvent): void => this.startResize(e, { t: true, r: true });
  protected resizeR = (e: PointerEvent): void => this.startResize(e, { r: true });
  protected resizeBR = (e: PointerEvent): void => this.startResize(e, { b: true, r: true });
  protected resizeB = (e: PointerEvent): void => this.startResize(e, { b: true });
  protected resizeBL = (e: PointerEvent): void => this.startResize(e, { b: true, l: true });
  protected resizeL = (e: PointerEvent): void => this.startResize(e, { l: true });

  // Keyboard move and resize

  /**
   * Alt+F7 moves and Alt+F8 resizes — the keys Windows has used for both since
   * Windows 3, and what GNOME and KDE bind too. Move and resize used to be
   * drag-only, which is a WCAG 2.1.1 failure on its own.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.model().keyboardMode()) {
      this.onModeKey(event);
      return;
    }
    if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'F7' && event.key !== 'F8') return;
    if (this.startKeyboard(event.key === 'F7' ? 'move' : 'resize')) event.preventDefault();
  }

  /**
   * Enter keyboard move or resize, with focus in the window so the keys arrive.
   * Returns `false` when the window may not be moved or resized.
   *
   * @internal
   */
  startKeyboard(mode: WrWindowKeyboardMode): boolean {
    const model = this.model();
    const ref = this.windowRef();
    if (ref) this.manager._activate(ref, { focus: false });
    if (!model.startKeyboard(mode)) return false;
    // Onto the window itself for the length of the mode, the way a desktop
    // does it: left on a button in the body, the Enter that ends the mode
    // pressed the button as well — and "Close" closed the window.
    this.elRef.nativeElement.focus({ preventScroll: true });
    this.announce(mode === 'move' ? this.moveModeText() : this.resizeModeText());
    return true;
  }

  private onModeKey(event: KeyboardEvent): void {
    const model = this.model();
    const step = event.shiftKey ? 1 : model.options().keyboardStep;
    const arrows: Record<string, readonly [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = arrows[event.key];
    if (delta) {
      event.preventDefault();
      if (model.keyboardMode() === 'move') {
        model.nudge(delta[0], delta[1]);
      } else {
        // The inline end edge moves: in a right-to-left page that is the left
        // one, so the arrow pointing away from the window still grows it.
        const rtl = this.dir?.value === 'rtl';
        model.grow(rtl ? -delta[0] : delta[0], delta[1], rtl);
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitKeyboard();
      this.focusLast();
    } else if (event.key === 'Escape') {
      // Claimed, so the manager's Escape does not close the window as well.
      event.preventDefault();
      const mode = model.cancelKeyboard();
      if (mode) this.announceGeometry(mode);
      this.focusLast();
    } else if (event.key === 'Tab') {
      this.commitKeyboard();
    }
  }

  /** Keep what the keyboard mode did, and say so. Focus is the caller's business. */
  private commitKeyboard(): void {
    const mode = this.model().commitKeyboard();
    if (mode) this.announceGeometry(mode);
  }

  private announceGeometry(mode: WrWindowKeyboardMode): void {
    const r = this.model().rect();
    this.announce(
      mode === 'move' ? this.movedText({ x: r.left, y: r.top }) : this.resizedText({ width: r.width, height: r.height })
    );
  }

  private announce(text: string): void {
    this.announcement.set(text);
  }
}
