/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  ViewContainerRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY, WR_RESPONSIVE_OVERLAYS, WrOutsideClick, wrFollowDirection, wrPresentAsSheet } from 'ngwr/overlay';
import { toClassList, type WrClassInput } from 'ngwr/utils';

import type { WrDropdownMenu } from './dropdown-menu';
import {
  WR_DROPDOWN_FALLBACKS,
  WR_DROPDOWN_POSITIONS,
  type WrDropdownPosition,
  type WrDropdownTrigger,
  wrDropdownPositions,
} from './interfaces';

/** Whether a placement puts the menu BESIDE its trigger, where the gap is inline padding. */
const isSidePlacement = (name: WrDropdownPosition): boolean => name === 'left' || name === 'right';

/**
 * Attach to any element to open a `<wr-dropdown-menu>` as a CDK overlay.
 *
 * @example
 * ```html
 * <button [wrDropdown]="menu" position="bottom-start" trigger="click">
 *   Actions
 * </button>
 *
 * <wr-dropdown-menu #menu>
 *   <wr-dropdown-item icon="copy" (click)="copy()">Copy</wr-dropdown-item>
 *   <wr-dropdown-item icon="trash" (click)="remove()">Delete</wr-dropdown-item>
 * </wr-dropdown-menu>
 * ```
 *
 * @see https://ngwr.dev/reference/components/dropdown
 */
let triggerUid = 0;

@Directive({
  selector: '[wrDropdown]',
  exportAs: 'wrDropdown',
  host: {
    class: 'wr-dropdown-trigger',
    '[attr.id]': 'triggerId',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'isOpen() ? menu().menuId() : null',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
  },
})
export class WrDropdown {
  /** Menu to open. Pass a `<wr-dropdown-menu>` template reference. */
  readonly menu = input.required<WrDropdownMenu>({ alias: 'wrDropdown' });

  /** How the menu opens. @default 'click' */
  readonly trigger = input<WrDropdownTrigger>('click');

  /**
   * Where the menu anchors relative to the trigger. A placement that does not
   * fit flips to the opposite side (a `left` / `right` menu may also drop below
   * or above, and then stays there until it closes), and the pane's
   * `wr-dropdown-overlay--<placement>` class names the side it actually took.
   * @default 'bottom-start'
   */
  readonly position = input<WrDropdownPosition>('bottom-start');

  /**
   * Draw a small arrow on the menu's edge, pointing at the trigger — the one
   * `wr-popover` and `wr-popconfirm` draw, from the same shared rule. It follows
   * the placement the menu actually took, so a flipped menu points the right
   * way, and it widens the gap to the trigger from 0.25rem to popover's 0.5rem
   * so the tip does not touch the control.
   *
   * Never drawn on a bottom sheet (`responsive`), which is anchored to nothing.
   * Turn it off on a menu with no padding of its own (`--wr-dropdown-padding: 0`)
   * or one that clips its overflow: the square reaches about 3px inside the
   * menu's border, over the first row, and `overflow` cuts its tip off.
   * Read when the menu opens. @default true
   */
  readonly arrow = input(true, { transform: coerceBooleanProperty });

  /**
   * Extra CSS classes for the menu's overlay pane.
   *
   * The pane is appended to the overlay container, not to this component, so
   * nothing in the consumer's own template encloses it and no descendant rule
   * written around the trigger can reach it. This input is the only per-instance
   * handle on it. A space-separated string works as well as an array.
   */
  readonly panelClass = input<WrClassInput>(null);

  /**
   * Present the menu as a full-width bottom-sheet on small viewports instead
   * of an anchored panel. `undefined` follows the app-wide
   * `provideWrResponsiveOverlays()` setting; `true`/`false` overrides it.
   * @default undefined
   */
  readonly responsive = input<boolean | undefined, BooleanInput>(undefined, {
    transform: (v: BooleanInput): boolean | undefined => (v == null ? undefined : coerceBooleanProperty(v)),
  });

  /** Fires after the menu opens. */
  readonly opened = output<void>();

  /** Fires after the menu closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  /**
   * The reading direction the open menu has to keep up with.
   *
   * Optional inject: `Directionality` is root-provided, so this is never null in
   * an app — but a bare `TestBed` that provides nothing should still get a menu
   * that opens, with simply nothing ambient to follow.
   */
  private readonly dir = inject(Directionality, { optional: true });
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly responsiveConfig = inject(WR_RESPONSIVE_OVERLAYS);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** @internal Public so host bindings can read it. */
  readonly isOpen = signal(false);

  /** The id used only when the consumer's element carries none of its own. */
  private readonly fallbackId = `wr-dropdown-trigger-${++triggerUid}`;

  /**
   * Id the menu names itself after. The trigger is the CONSUMER's own element, so
   * an `id` they already put there wins: overwriting it broke `<label for>`,
   * `document.getElementById` and any `aria-labelledby` aimed at that button from
   * elsewhere in their app. The generated one is only a fallback so the menu has
   * something to reference.
   *
   * A GETTER, read fresh by the host binding on every pass, rather than a field
   * resolved in the constructor. A static `id="…"` is on the element before a
   * directive is instantiated and so was already honoured; a BOUND `[id]` is
   * not — it lands with the rest of the template's bindings, which run before
   * host bindings but after construction, so the constructor read an empty
   * string, fell through to the fallback, and the host binding then wrote that
   * fallback over the value the template had just set. Everything bound was
   * lost — `[id]`, `[attr.id]` and an interpolated `id="dd-{{ n }}"` alike —
   * while the static form survived, which is the shape that makes it look like
   * a naming convention rather than a defect.
   *
   * `.id` rather than `getAttribute`: it is always a string, and an empty one is
   * no id at all, so it falls through to the fallback.
   */
  protected get triggerId(): string {
    return this.host.nativeElement.id || this.fallbackId;
  }

  private overlayRef: OverlayRef | null = null;

  constructor() {
    // The host view carrying `[wrDropdown]` can be destroyed while the menu is
    // open — a route change, or an `@if` around the trigger. The overlay lives
    // in the CDK container, not in that view, so nothing removes it unless we do.
    this.destroyRef.onDestroy(() => this.closeOverlay(false));

    effect(() => {
      if (this.isOpen()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  /** Open the menu. */
  open(): void {
    this.isOpen.set(true);
  }

  /** Close the menu. */
  close(): void {
    this.isOpen.set(false);
  }

  /** Toggle the menu. */
  toggle(): void {
    this.isOpen.update(v => !v);
  }

  // Host listeners

  /** @internal */
  /**
   * Whether the pointer, rather than the keyboard, opened the current menu.
   *
   * A hover-opened menu must not take focus — the APG shows a menu on hover and
   * leaves the caret where it was — while a keyboard-opened one must. The
   * trigger MODE cannot answer that on its own: a `trigger="hover"` menu is
   * still openable with Enter, and that open should focus the first item.
   */
  private openedByPointer = false;

  protected onClick(event: MouseEvent): void {
    if (this.trigger() !== 'click') return;
    event.stopPropagation();
    this.openedByPointer = false;
    this.toggle();
  }

  /** @internal */
  protected onMouseEnter(): void {
    if (this.trigger() !== 'hover') return;
    // A POINTER opened this, so the menu must not take the keyboard with it —
    // see `openedByPointer`.
    this.openedByPointer = true;
    this.isOpen.set(true);
  }

  /** @internal */
  protected onMouseLeave(event: MouseEvent): void {
    if (this.trigger() !== 'hover') return;
    const related = event.relatedTarget as Node | null;
    if (related && this.overlayRef?.overlayElement.contains(related)) return;
    this.isOpen.set(false);
  }

  // Overlay management

  private openOverlay(): void {
    if (this.overlayRef) return;

    // On small viewports (when opted in) detach from the trigger and present
    // the menu as a full-width slide-up sheet pinned to the bottom edge.
    const asSheet = wrPresentAsSheet(this.responsive(), this.responsiveConfig);
    const requested = this.position();
    // A list of fresh objects, kept: the CDK reports the link it landed on by
    // handing that same object back, which is how the pane learns its placement.
    const positions = wrDropdownPositions(requested);

    // `withGrowAfterOpen`: past the first pass the CDK never gives the pane a box
    // larger than the last one it gave it. A menu measured with the wrong gap
    // (see the `positionChanges` handler below) is laid out once in a box sized
    // for the placement it is about to leave, and without this the pass that
    // corrects it inherits that box — a `right` menu with 70px below its trigger
    // moved above it into a 70px box and was squeezed all the same. The menu's
    // content does not change while it is open, so the box only ever grows back
    // to what the menu already needs.
    const connected = asSheet
      ? null
      : this.overlay
          .position()
          .flexibleConnectedTo(this.host)
          .withPositions(positions)
          .withPush(true)
          .withGrowAfterOpen(true);

    const positionStrategy = connected ?? this.overlay.position().global().centerHorizontally().bottom('0');

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: asSheet ? this.scrollStrategies.block() : this.scrollStrategies.reposition(),
      width: asSheet ? '100%' : undefined,
      hasBackdrop: asSheet,
      backdropClass: asSheet ? 'wr-overlay-backdrop' : undefined,
      // A sheet is anchored to nothing, so it gets neither a placement nor an
      // arrow. A floating menu starts on the placement it asked for, which is
      // what the CDK measures it with — see `wrDropdownPositions` for why that
      // class must already be on the pane rather than arrive with the position.
      panelClass: asSheet
        ? toClassList('wr-dropdown-overlay', 'wr-overlay-sheet', this.panelClass())
        : toClassList(
            'wr-dropdown-overlay',
            `wr-dropdown-overlay--${requested}`,
            this.arrow() && 'wr-dropdown-overlay--arrow',
            this.panelClass()
          ),
    });

    // When the menu flips, the pane has to name the side it actually took: the
    // gap padding belongs on the edge facing the trigger and the arrow hangs off
    // that same edge, and both key off this class. The CDK emits synchronously
    // from inside its own `apply()`, so the swap lands in the same frame as the
    // move, and the next measurement (a scroll, a resize) sees the new gap.
    if (connected) {
      const ref = this.overlayRef;
      const pane = ref.overlayElement;
      // Index-aligned: `links[i]` is the object the CDK hands back for `chain[i]`.
      let chain = WR_DROPDOWN_FALLBACKS[requested];
      let links = positions;
      connected.positionChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ connectionPair }) => {
        const landed = chain[links.indexOf(connectionPair)];
        if (!landed) return;
        for (const name of Object.keys(WR_DROPDOWN_POSITIONS)) {
          pane.classList.toggle(`wr-dropdown-overlay--${name}`, name === landed);
        }

        // A `left` / `right` menu that fell below or above was tested for fit
        // with the WRONG gap. The CDK measures the pane once per pass, for every
        // link, with the class on it at the time — the side placement's, whose
        // gap is inline padding — so the block link was judged by a box one gap
        // shorter than the one the swap above has just given it, and a menu with
        // less room than that gap was squeezed instead of flipped. Measured in
        // Chromium at 375×700, `right` with 76px below the trigger: the menu shrank
        // from 74px to 68px and its last row ran through the bottom border.
        //
        // So the sides are dropped for as long as this menu stays open and the
        // pane is measured again, now carrying the block gap, against block links
        // only. Not re-admitted afterwards: measured with a block gap, a side link
        // looks one gap narrower than it renders, which is the same mistake the
        // other way round and a menu that would flap between the two. Deferred to
        // a microtask because this runs INSIDE the CDK's `apply()`, which records
        // the link it landed on after this returns — a nested pass would have that
        // record overwritten by the outer one. A microtask still lands before the
        // frame is painted.
        if (isSidePlacement(landed) || !chain.some(isSidePlacement)) return;
        const kept = chain.flatMap((name, i) => (isSidePlacement(name) ? [] : [i]));
        chain = kept.map(i => chain[i]);
        links = kept.map(i => links[i]);
        connected.withPositions(links);
        queueMicrotask(() => {
          if (this.overlayRef === ref) ref.updatePosition();
        });
      });
    }

    // `create()` above froze the direction into the ref as a string, and nothing
    // in the CDK ever revisits it. This menu is where it shows first: the docs
    // site keeps its own LTR/RTL switch INSIDE a dropdown, so the flip is made
    // from within the one panel that has to answer it.
    //
    // No callback — `WR_DROPDOWN_POSITIONS` anchors on `start` / `end` and
    // carries no `offsetX`, so letting the CDK re-resolve those against the new
    // direction is the whole job; the sheet has no anchor at all and only needs
    // the `dir` on its host.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    if (asSheet) {
      this.overlayRef
        .backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.isOpen.set(false));
    }

    // Wire trigger id into menu so it can render aria-labelledby.
    this.menu().triggerId.set(this.triggerId);

    const portal = new TemplatePortal(this.menu().contentTpl(), this.vcr);
    this.overlayRef.attach(portal);

    // Focus the first menu item after the menu renders — unless a POINTER
    // opened it. This used to be unconditional, so merely sweeping the cursor
    // over a `trigger="hover"` menu yanked the caret out of whatever the user
    // was typing; the APG's own rule is that hover shows a menu and does not
    // move focus into it. A keyboard open (Enter / Space / ArrowDown) still
    // focuses the first item, on a hover trigger too.
    if (!this.openedByPointer) queueMicrotask(() => this.focusItemAt(0));

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.isOpen.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        this.handleMenuKeydown(event);
      });

    if (this.trigger() === 'hover') {
      this.overlayRef.overlayElement.addEventListener('mouseleave', this.onOverlayMouseLeave);
    }

    this.opened.emit();
  }

  /**
   * Tear the overlay down, and tell the host — unless the host is going away
   * with it.
   *
   * `notify: false` is the DESTROY path, and it is not a nicety. An `output()`
   * belongs to the view that declares it, so emitting from `onDestroy` is
   * refused: Angular logs `NG0953: Unexpected emit for destroyed OutputRef` and
   * the listener never runs. Measured — a `(closed)` handler on a dropdown whose
   * host view is removed while the menu is open fired zero times and left a
   * console error behind. There is nobody to notify at that point, because the
   * consumer's own view is being torn down in the same pass; `wr-popconfirm`
   * already disposes without emitting, and this brings the other two into line.
   *
   * The focus hand-back is skipped for the same reason — the host element is on
   * its way out of the document.
   */
  private closeOverlay(notify = true): void {
    if (!this.overlayRef) return;
    if (this.trigger() === 'hover') {
      this.overlayRef.overlayElement.removeEventListener('mouseleave', this.onOverlayMouseLeave);
    }
    // Take the focus back before the pane goes, or it lands on `<body>` and the
    // next Tab starts from the top of the document. Only when focus is actually
    // inside the menu: closing a menu nobody was in must not steal the caret
    // from wherever the user has since moved.
    const active = document.activeElement;
    const focusWasInside = active instanceof Node && this.overlayRef.overlayElement.contains(active);
    this.overlayRef.dispose();
    this.overlayRef = null;
    if (notify) {
      if (focusWasInside) this.host.nativeElement.focus();
      this.closed.emit();
    }
  }

  // Keyboard handling

  /** @internal Trigger keydown — ArrowDown/Up/Enter/Space open the menu. */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.isOpen()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Opened from the keyboard — including on a `hover` trigger, which stays
      // keyboard-operable — so the first item SHOULD take focus.
      this.openedByPointer = false;
      this.open();
    }
  }

  private handleMenuKeydown(event: KeyboardEvent): void {
    const items = this.getItems();
    if (items.length === 0 && event.key !== 'Escape' && event.key !== 'Tab') return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;

    // CDK's keyboard dispatcher feeds this overlay EVERY document keydown, not
    // just the ones typed into it — and a `trigger="hover"` menu is open with
    // the caret deliberately left wherever the user was (see `openedByPointer`).
    // So ownership is checked here rather than assumed: without it, ArrowDown /
    // ArrowUp / Home / End pressed in an unrelated field were `preventDefault`ed
    // and yanked focus into the menu. The trigger counts as ours — a hover menu
    // that the user has tabbed back to should still open to the keyboard.
    const typedIn = event.target;
    const ours =
      typedIn instanceof Node &&
      (this.host.nativeElement.contains(typedIn) || (this.overlayRef?.overlayElement.contains(typedIn) ?? false));
    // Escape (and Tab) still close from anywhere — routing to the topmost
    // overlay regardless of focus is the dispatcher's whole job. Escape just
    // must not drag the caret onto the trigger from a field the user is in.
    if (!ours && event.key !== 'Escape' && event.key !== 'Tab') return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.isOpen.set(false);
        if (ours) this.host.nativeElement.focus();
        break;
      case 'Tab':
        // Let focus leave naturally; close the menu.
        this.isOpen.set(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusItemAt(idx < items.length - 1 ? idx + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusItemAt(idx > 0 ? idx - 1 : items.length - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusItemAt(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItemAt(items.length - 1);
        break;
      default:
        break;
    }
  }

  private getItems(): readonly HTMLElement[] {
    if (!this.overlayRef) return [];
    return Array.from(
      this.overlayRef.overlayElement.querySelectorAll<HTMLElement>('.wr-dropdown-item:not(.wr-dropdown-item--disabled)')
    );
  }

  private focusItemAt(index: number): void {
    const items = this.getItems();
    if (items.length === 0) return;
    const clamped = ((index % items.length) + items.length) % items.length;
    items[clamped]?.focus();
  }

  private readonly onOverlayMouseLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && this.host.nativeElement.contains(related)) return;
    this.isOpen.set(false);
  };
}
