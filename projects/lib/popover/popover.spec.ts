import { FocusMonitor, type FocusOrigin } from '@angular/cdk/a11y';
import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { WrDrawerManager } from 'ngwr/drawer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPopover } from './popover';
import { WR_POPOVER_FALLBACKS, WR_POPOVER_POSITIONS, type WrPopoverPosition, wrPopoverPositions } from './types';

/**
 * `[wrPopover]` renders its panel into a CDK overlay, so nothing it opens is
 * reachable from the fixture — every query for a panel goes through the
 * document. That container belongs to the TestBed's root injector, so it cannot
 * leak into the next spec file.
 *
 * The directive is really two components in one: `mode="popover"` (template
 * content, click/hover trigger, dialog semantics) and `mode="tooltip"` (string
 * content, hover+focus with delays, `aria-describedby`). Both host shapes are
 * mounted here so the differences can be asserted side by side.
 *
 * Timers are faked because the tooltip's show/hide delays and the hover
 * popover's grace period are the behaviour, not incidental timing.
 */
@Component({
  imports: [WrPopover],
  template: `
    <button
      type="button"
      class="click-trigger"
      [wrPopover]="panel"
      [position]="position()"
      [ariaLabel]="panelLabel()"
      (opened)="openCount.set(openCount() + 1)"
      (closed)="closeCount.set(closeCount() + 1)"
    >
      Details
    </button>

    <button type="button" class="hover-trigger" [wrPopover]="panel" trigger="hover">Hover</button>

    <button type="button" class="tip-trigger" [wrPopover]="tip()" mode="tooltip">Save</button>

    <!-- A tooltip on a WRAPPER, so a focusable descendant can blur under it. -->
    <span class="wrap-trigger" wrPopover="Wrapped" mode="tooltip">
      <button type="button" class="inner-trigger">Inner</button>
    </span>

    <ng-template #panel>
      <p class="panel-body">Anything you can render.</p>
      <button type="button" class="panel-action">Act</button>
    </ng-template>
  `,
})
class Host {
  readonly tip = signal('Save changes');
  readonly position = signal<WrPopoverPosition | null>(null);
  readonly panelLabel = signal<string | null>(null);
  readonly openCount = signal(0);
  readonly closeCount = signal(0);
}

/** Something for `WrDrawerManager` to mount in the round-trip case below. */
@Component({ template: '<p>Filters</p>' })
class DrawerPanel {}

/**
 * A real window for the CDK to place panels in, for every case in the file.
 *
 * jsdom reports `<html>` — the box the CDK measures the viewport by — as 0×0,
 * and the directive's viewport margin narrows that to a NEGATIVE one. Nothing
 * fits there, and the fallback is ranked on products of negative lengths, which
 * sends a `left` panel to the right. A 1024×768 window gives the 0×0 pane room
 * on every side, so the placement asked for is the one taken.
 */
beforeEach(() => {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
});

afterEach(() => {
  // Own properties shadowing jsdom's prototype getters; deleting them restores those.
  Reflect.deleteProperty(document.documentElement, 'clientWidth');
  Reflect.deleteProperty(document.documentElement, 'clientHeight');
});

describe('WrPopover', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (kind: 'click' | 'hover' | 'tip' | 'wrap' | 'inner'): HTMLElement =>
    root().querySelector<HTMLElement>(`.${kind}-trigger`)!;

  const popoverPane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popover-overlay');
  const tooltipPane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-tooltip-overlay');

  /** Move the clock and let the resulting signal write reach the DOM. */
  const tick = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  const enter = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };

  const leave = (el: HTMLElement, relatedTarget: EventTarget | null = null): void => {
    el.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget }));
    fixture.detectChanges();
  };

  /**
   * Focus the tooltip trigger with an ORIGIN.
   *
   * `FocusMonitor` is what the directive reads, and it is the only thing in the
   * DOM that can tell a Tab from a `.focus()` call — a hand-built `FocusEvent`
   * carries no origin at all, so a case written with one would pass against the
   * broken directive and the fixed one alike.
   */
  const focusVia = (origin: FocusOrigin): void => {
    TestBed.inject(FocusMonitor).focusVia(trigger('tip'), origin);
    fixture.detectChanges();
  };

  const press = (key: string, target: EventTarget = document.body): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  describe('popover mode', () => {
    const open = (): void => {
      trigger('click').click();
      fixture.detectChanges();
    };

    it('advertises a dialog on the trigger before anything is opened', () => {
      expect(trigger('click').getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger('click').getAttribute('aria-expanded')).toBe('false');
      // Nothing to point at until the panel exists.
      expect(trigger('click').getAttribute('aria-controls')).toBeNull();
    });

    it('renders no panel until it is opened', () => {
      expect(popoverPane()).toBeNull();
    });

    it('opens on click and flips aria-expanded', () => {
      open();
      expect(trigger('click').getAttribute('aria-expanded')).toBe('true');
      expect(popoverPane()).toBeTruthy();
    });

    it('puts the panel in the isolated overlay container, not in the fixture', () => {
      open();
      // ngwr overlays are isolated by default, so a panel cannot land in the same
      // container as Material's or NG-ZORRO's.
      expect(root().querySelector('.panel-body')).toBeNull();
      expect(document.querySelector('.wr-overlay-container .panel-body')?.textContent).toContain(
        'Anything you can render.'
      );
    });

    it('names the open panel from the trigger', () => {
      open();
      expect(trigger('click').getAttribute('aria-controls')).toBe(popoverPane()?.id);
      expect(popoverPane()?.id).toBeTruthy();
    });

    it('gives the panel non-modal dialog semantics', () => {
      open();
      // Non-modal is deliberate: focus is not trapped, and the panel dismisses
      // on outside click / Escape rather than blocking the page.
      expect(popoverPane()?.getAttribute('role')).toBe('dialog');
      expect(popoverPane()?.getAttribute('aria-modal')).toBe('false');
    });

    it('always gives the dialog an accessible name', () => {
      open();
      // REGRESSION GUARD. The panel used to ship `role="dialog"` with neither
      // `aria-label` nor `aria-labelledby` — an unnamed dialog, announced as
      // "dialog" and nothing else, exactly what axe's `aria-dialog-name` rule
      // (serious) flags. `pnpm check:a11y` never caught it because the sweep
      // does not open the panel, and there was no input to supply a name from
      // outside either. The catalog default (`popover.label`) now names it even
      // when the consumer says nothing.
      expect(popoverPane()?.getAttribute('aria-label')).toBe('Popover');
    });

    it('lets the consumer override the panel name', () => {
      fixture.componentInstance.panelLabel.set('Order details');
      fixture.detectChanges();
      open();

      expect(popoverPane()?.getAttribute('aria-label')).toBe('Order details');
    });

    it('carries the public overlay classes, including the resolved position', () => {
      open();
      // Consumers style the arrow and the panel off these — they are public API.
      expect(popoverPane()?.classList.contains('wr-popover-overlay')).toBe(true);
      expect(popoverPane()?.classList.contains('wr-popover-overlay--bottom')).toBe(true);
    });

    it('uses the requested position when one is given', () => {
      fixture.componentInstance.position.set('right');
      fixture.detectChanges();
      open();
      expect(popoverPane()?.classList.contains('wr-popover-overlay--right')).toBe(true);
    });

    it('keeps a side-placed panel clear of its trigger', () => {
      fixture.componentInstance.position.set('left');
      fixture.detectChanges();
      open();

      // The 8px gap in WR_POPOVER_POSITIONS reaches the DOM as the CDK's own
      // transform, which is what makes the RTL twin below assertable at all.
      expect(popoverPane()?.getAttribute('style')).toContain('translateX(-8px)');
    });

    it('toggles shut on a second click of the trigger', () => {
      open();
      trigger('click').click();
      fixture.detectChanges();

      expect(popoverPane()).toBeNull();
      expect(trigger('click').getAttribute('aria-expanded')).toBe('false');
      expect(trigger('click').getAttribute('aria-controls')).toBeNull();
    });

    it('closes on a click outside itself', () => {
      open();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(popoverPane()).toBeNull();
    });

    it('stays open for a click inside the panel', () => {
      open();
      document
        .querySelector<HTMLElement>('.panel-body')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(popoverPane()).toBeTruthy();
    });

    /**
     * WCAG F85, the documented failure of 2.4.3: the overlay container sits at
     * the end of `<body>`, so a dialog that never takes focus is neither next in
     * the tab order nor given it — Tab from the trigger went to the next control
     * on the PAGE and left the panel behind. The pane itself takes focus rather
     * than the first control inside it; Tab from the pane reaches that control
     * anyway, because the pane precedes its own content.
     */
    it('moves focus into the panel when it opens from a click', () => {
      open();

      const pane = popoverPane()!;
      expect(document.activeElement, 'the dialog opened behind the tab order').toBe(pane);
      expect(pane.tabIndex).toBe(-1);
      // And the content is rendered by then, so a reader has something to read.
      expect(pane.querySelector('.panel-action')).toBeTruthy();
    });

    it('leaves the caret alone for a hover-triggered popover', () => {
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      try {
        elsewhere.focus();
        enter(trigger('hover'));

        // Stealing focus here would also be self-defeating: the 120ms hover
        // close would dispose the pane out from under the focused element.
        expect(document.querySelector('.wr-popover-overlay')).toBeTruthy();
        expect(document.activeElement).toBe(elsewhere);
      } finally {
        elsewhere.remove();
      }
    });

    /**
     * A popover is not a tooltip: it attaches a `role="dialog"` pane whose
     * whole point is interactive content, so the caret is often inside it when
     * it closes. Disposing without handing focus back dropped it on `<body>`
     * and the next Tab restarted from the top of the document.
     */
    it('gives focus back to the trigger when the caret was inside', () => {
      open();
      const inside = document.querySelector<HTMLButtonElement>('.panel-action')!;
      inside.focus();

      press('Escape');

      expect(popoverPane()).toBeNull();
      expect(document.activeElement, 'focus was stranded on <body>').toBe(trigger('click'));
    });

    it('leaves focus alone when it had already moved elsewhere', () => {
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      try {
        open();
        elsewhere.focus();

        press('Escape');

        expect(popoverPane()).toBeNull();
        expect(document.activeElement, 'the close fought the user for the caret').toBe(elsewhere);
      } finally {
        elsewhere.remove();
      }
    });

    it('closes on Escape from anywhere on the page', () => {
      open();
      // The host's own `keydown.escape` binding is tooltip-only; a popover is
      // closed by the overlay's keyboard dispatcher, which is why this works
      // with focus nowhere near the trigger.
      press('Escape');

      expect(popoverPane()).toBeNull();
      expect(trigger('click').getAttribute('aria-expanded')).toBe('false');
    });

    it('emits opened and closed once each per cycle', () => {
      open();
      expect(fixture.componentInstance.openCount()).toBe(1);
      expect(fixture.componentInstance.closeCount()).toBe(0);

      press('Escape');
      expect(fixture.componentInstance.openCount()).toBe(1);
      expect(fixture.componentInstance.closeCount()).toBe(1);
    });

    it('ignores hover while the trigger is click-driven', () => {
      enter(trigger('click'));
      expect(popoverPane()).toBeNull();
    });
  });

  describe('popover mode, hover trigger', () => {
    it('opens the moment the pointer arrives — no delay on the way in', () => {
      enter(trigger('hover'));
      expect(popoverPane()).toBeTruthy();
    });

    it('ignores clicks once the trigger is hover-driven', () => {
      enter(trigger('hover'));
      trigger('hover').click();
      fixture.detectChanges();

      // A click must not toggle a hover popover shut — the pointer is still
      // on the trigger, so it would immediately want to be open again.
      expect(popoverPane()).toBeTruthy();
    });

    it('waits a beat after the pointer leaves so it can cross the gap to the panel', () => {
      enter(trigger('hover'));
      leave(trigger('hover'));

      tick(119);
      expect(popoverPane()).toBeTruthy();

      tick(1);
      expect(popoverPane()).toBeNull();
    });

    it('cancels the pending close when the pointer reaches the panel', () => {
      enter(trigger('hover'));
      const pane = popoverPane()!;
      leave(trigger('hover'));
      enter(pane);

      tick(500);
      expect(popoverPane()).toBeTruthy();
    });

    it('closes when the pointer leaves the panel itself', () => {
      enter(trigger('hover'));
      const pane = popoverPane()!;
      leave(trigger('hover'));
      enter(pane);
      leave(pane);

      tick(120);
      expect(popoverPane()).toBeNull();
    });

    it('does not even schedule a close when the pointer leaves straight into the panel', () => {
      enter(trigger('hover'));
      // `relatedTarget` is where the pointer went. Landing inside the panel is
      // not "leaving" at all, so no close is queued in the first place.
      leave(trigger('hover'), popoverPane());
      tick(500);

      expect(popoverPane()).toBeTruthy();
    });
  });

  describe('tooltip mode', () => {
    it('describes the trigger instead of claiming a popup', () => {
      // A tooltip is a label, not something the button owns — so no
      // `aria-haspopup` and no `aria-expanded`, either open or closed.
      expect(trigger('tip').getAttribute('aria-haspopup')).toBeNull();
      expect(trigger('tip').getAttribute('aria-expanded')).toBeNull();
      expect(trigger('tip').getAttribute('aria-describedby')).toBeNull();
    });

    it('opens on hover only after the show delay', () => {
      enter(trigger('tip'));
      tick(119);
      expect(tooltipPane()).toBeNull();

      tick(1);
      expect(tooltipPane()).toBeTruthy();
    });

    it('renders the string as a tooltip panel in the overlay container', () => {
      enter(trigger('tip'));
      tick(120);

      expect(tooltipPane()?.getAttribute('role')).toBe('tooltip');
      expect(document.querySelector('.wr-overlay-container .wr-tooltip')?.textContent).toBe('Save changes');
      expect(tooltipPane()?.classList.contains('wr-tooltip-overlay--top')).toBe(true);
    });

    it('follows the bound string while it is on screen', () => {
      enter(trigger('tip'));
      tick(120);
      expect(document.querySelector('.wr-overlay-container .wr-tooltip')?.textContent).toBe('Save changes');

      // The string used to be pushed into the panel exactly once, at open, and
      // the effect that would push a new one re-enters `openOverlay()` and bails
      // on the panel already being up. So the classic copy button — hover it,
      // click it, the label flips to "Copied" — kept showing the old text until
      // the pointer left and came back.
      fixture.componentInstance.tip.set('Saved');
      fixture.detectChanges();

      expect(document.querySelector('.wr-overlay-container .wr-tooltip')?.textContent).toBe('Saved');
    });

    it('carries role="tooltip" exactly once, on the pane aria-describedby points at', () => {
      enter(trigger('tip'));
      tick(120);

      // REGRESSION GUARD. The role used to be set twice — once by the directive
      // on the overlay pane and once by the internal `wr-popover-text` host —
      // so an open tooltip was a tooltip nested inside a tooltip, announced
      // twice. The pane is the one `aria-describedby` resolves to, so the
      // inner host lost its role.
      const roles = document.querySelectorAll('.wr-overlay-container [role="tooltip"]');
      expect(roles).toHaveLength(1);
      expect(roles[0]).toBe(tooltipPane());
      expect(document.querySelector('.wr-overlay-container .wr-tooltip')?.getAttribute('role')).toBeNull();
    });

    it('points aria-describedby at the panel while it is showing', () => {
      enter(trigger('tip'));
      tick(120);

      expect(trigger('tip').getAttribute('aria-describedby')).toBe(tooltipPane()?.id);
    });

    it('hides after the pointer leaves', () => {
      enter(trigger('tip'));
      tick(120);

      leave(trigger('tip'));
      tick(60);
      expect(tooltipPane()).toBeNull();
    });

    /**
     * WCAG 1.4.13 (Hoverable): a tooltip the pointer can be moved onto without
     * it vanishing. Someone reading a long hint at 400% zoom needs the text
     * itself to be reachable. The other half of the fix is in the stylesheet —
     * the pane used to be `pointer-events: none`, which made every listener
     * below dead — and no jsdom spec can see it: there is no CSS cascade here,
     * so `dispatchEvent` reaches an inert pane just as happily.
     */
    it('stays up once the pointer moves onto the panel', () => {
      enter(trigger('tip'));
      tick(120);
      const pane = tooltipPane()!;

      leave(trigger('tip'));
      enter(pane);

      tick(500);
      expect(tooltipPane(), 'the tooltip vanished before the pointer arrived').toBeTruthy();
    });

    it('never even arms the hide when the pointer crosses straight onto the panel', () => {
      enter(trigger('tip'));
      tick(120);
      const pane = tooltipPane()!;

      leave(trigger('tip'), pane);

      tick(500);
      expect(tooltipPane()).toBeTruthy();
    });

    it('hides on the same delay once the pointer leaves the panel too', () => {
      enter(trigger('tip'));
      tick(120);
      const pane = tooltipPane()!;
      leave(trigger('tip'));
      enter(pane);

      leave(pane);
      tick(59);
      expect(tooltipPane()).toBeTruthy();

      tick(1);
      expect(tooltipPane()).toBeNull();
    });

    it('goes back to the trigger without a flicker', () => {
      enter(trigger('tip'));
      tick(120);
      const pane = tooltipPane()!;
      leave(trigger('tip'));
      enter(pane);

      leave(pane, trigger('tip'));
      tick(500);
      expect(tooltipPane()).toBeTruthy();
    });

    it('drops a pending show when the pointer leaves before the delay elapses', () => {
      enter(trigger('tip'));
      tick(50);
      leave(trigger('tip'));

      tick(500);
      expect(tooltipPane()).toBeNull();
    });

    it('closes on Escape typed on the trigger', () => {
      enter(trigger('tip'));
      tick(120);

      // WAI-ARIA requires Escape to dismiss a tooltip without moving focus —
      // here the directive's own host binding does it, not the overlay.
      press('Escape', trigger('tip'));
      expect(tooltipPane()).toBeNull();
    });

    it('never opens for an empty string', () => {
      fixture.componentInstance.tip.set('');
      fixture.detectChanges();

      enter(trigger('tip'));
      tick(500);
      expect(tooltipPane()).toBeNull();
    });

    it('ignores clicks — a tooltip is not a toggle', () => {
      trigger('tip').click();
      fixture.detectChanges();
      tick(500);

      expect(tooltipPane()).toBeNull();
    });
  });

  /**
   * A tooltip answers the KEYBOARD, and that distinction is the whole of this
   * block.
   *
   * The host used to bind `(focus)`, which fires for any focus at all — including
   * the one an overlay hands BACK to the trigger it was opened from. `WrDrawer`
   * and `WrDialog` both restore the element that was active when they opened, and
   * so does this directive for its own popover, so closing a drawer re-showed the
   * tooltip on the button behind it with nothing left to dismiss it: the pointer
   * is elsewhere, so no `mouseleave` ever comes, and focus stays on the button, so
   * no blur either. Reported from a live app as a `.wr-tooltip-overlay` stranded
   * under its trigger.
   *
   * `FocusMonitor`'s origin is most of the answer and not all of it: it reads
   * `keyboard` for the hand-back too, because the dismissal that caused it IS a
   * keystroke. The last three cases are that half.
   */
  describe('tooltip mode, focus origin', () => {
    it('opens for a keyboard focus, so keyboard users get the same hint', () => {
      focusVia('keyboard');
      tick(119);
      expect(tooltipPane()).toBeNull();

      tick(1);
      expect(tooltipPane()).toBeTruthy();
      expect(trigger('tip').getAttribute('aria-describedby')).toBe(tooltipPane()?.id);
    });

    it('stays shut for a programmatic focus', () => {
      // The reporter's own repro, minus the drawer: put the pointer's last
      // interaction somewhere else, let the clock run past every delay, then
      // focus the trigger the way a closing overlay restores it.
      trigger('tip').blur();
      document.body.click();
      tick(600);

      trigger('tip').focus();
      tick(600);

      expect(document.activeElement, 'the trigger never took focus at all').toBe(trigger('tip'));
      expect(tooltipPane(), 'stranded: no pointer to leave, no focus to lose, nothing to dismiss it').toBeNull();
    });

    it('stays shut for a mouse focus, and hover still opens the same trigger', () => {
      // Clicking a button focuses it in a real browser. Showing on that focus
      // would mean the pointer path fires twice for one gesture, which is why
      // hover — and only hover — owns it.
      focusVia('mouse');
      tick(600);
      expect(tooltipPane()).toBeNull();

      enter(trigger('tip'));
      tick(120);
      expect(tooltipPane(), 'ignoring the mouse ORIGIN cost the trigger its hover').toBeTruthy();
    });

    it('hides after the hide delay once focus leaves', () => {
      focusVia('keyboard');
      tick(120);
      expect(tooltipPane()).toBeTruthy();

      trigger('tip').blur();
      fixture.detectChanges();
      tick(59);
      expect(tooltipPane()).toBeTruthy();

      tick(1);
      expect(tooltipPane()).toBeNull();
      expect(trigger('tip').getAttribute('aria-describedby')).toBeNull();
    });

    it('leaves a POPOVER trigger alone on the one origin that opens a tooltip', () => {
      // The monitor is attached in both modes, so that a `[mode]` flipped after
      // the first render is not half-wired. That puts the whole burden on the
      // handler's `isTooltip()` guard, which is what this asserts.
      TestBed.inject(FocusMonitor).focusVia(trigger('click'), 'keyboard');
      fixture.detectChanges();
      tick(600);

      expect(popoverPane()).toBeNull();
      expect(trigger('click').getAttribute('aria-expanded')).toBe('false');
    });

    /**
     * The reported scenario, and the half a `keyboard` origin cannot see on its
     * own.
     *
     * `FocusMonitor` calls a focus `keyboard` when ANY key went down within the
     * millisecond before it — and the drawer that hands focus back does so while
     * Escape is still being handled, synchronously, inside
     * `WrDrawerRef.teardown()`. The modality detector listens on `document` in
     * capture and the overlay's keyboard dispatcher on `<body>` in bubble, so
     * the modality is already `keyboard` by the time the drawer runs. No drawer
     * is mounted here: the shape is the keystroke, then the hand-back.
     */
    it('stays shut when an overlay hands focus back during the Escape that dismissed it', () => {
      press('Escape');
      trigger('tip').focus();
      fixture.detectChanges();
      tick(600);

      expect(document.activeElement, 'the hand-back did not land').toBe(trigger('tip'));
      expect(tooltipPane(), 'Escape dismissed something and the tooltip took the focus for a Tab').toBeNull();
    });

    it('survives the reported round trip, with a real drawer', () => {
      // The mechanism above, assembled: focus the tooltipped button, open a
      // drawer from it, dismiss the drawer with Escape from inside it, and let
      // `WrDrawerRef.teardown()` put focus back where it found it.
      trigger('tip').focus();
      TestBed.inject(WrDrawerManager).open(DrawerPanel);
      fixture.detectChanges();

      const close = document.querySelector<HTMLElement>('.wr-drawer__close')!;
      close.focus();
      press('Escape', close);
      tick(600);

      expect(document.querySelector('.wr-drawer__panel'), 'the drawer never closed').toBeNull();
      expect(document.activeElement, 'the drawer never handed focus back').toBe(trigger('tip'));
      expect(tooltipPane(), 'the reported strand: a pane under the trigger the drawer came back to').toBeNull();
    });

    it('stays shut when a ✕ activated with Enter hands focus back', () => {
      // Enter on a button dispatches its click as the keydown's default action,
      // so the close — and the hand-back inside it — runs while `Enter` is still
      // the keystroke in flight.
      press('Enter');
      trigger('tip').focus();
      fixture.detectChanges();
      tick(600);

      expect(tooltipPane()).toBeNull();
    });

    it('forgets a keystroke once it is over, so a later focus is judged on its own', () => {
      // The key is only evidence about the focus that lands DURING it. A screen
      // reader's virtual cursor reaches `FocusMonitor` as a keyboard origin with
      // no keystroke at all, and an Escape pressed a minute ago must not be what
      // decides that one.
      press('Escape');
      tick(600);

      focusVia('keyboard');
      tick(120);

      expect(tooltipPane(), 'a stale key silenced a focus that had nothing to do with it').toBeTruthy();
    });

    it('opens when TAB is the keystroke that put focus there', () => {
      // The other side of the same coin, and the reason the refusal is keyed on
      // the key rather than on "focus moved during a keystroke": Tab, and the
      // arrows a roving composite listens for, are how a keyboard user arrives.
      press('Tab');
      trigger('tip').focus();
      fixture.detectChanges();
      tick(120);

      expect(tooltipPane(), 'refusing every keystroke would take the hint from Tab as well').toBeTruthy();
    });

    /**
     * `FocusMonitor` reports a blur on a DESCENDANT of a monitored element as a
     * blur of the element itself: `_onFocus` bails when the event target is not
     * the monitored node, `_onBlur` has no matching guard. The host binding this
     * replaced never bubbled, so a tooltip on a wrapper had nothing to lose.
     */
    it('keeps a hover tooltip up while a CHILD of the trigger loses focus', () => {
      enter(trigger('wrap'));
      tick(120);
      expect(tooltipPane()).toBeTruthy();

      trigger('inner').focus();
      fixture.detectChanges();
      trigger('inner').blur();
      fixture.detectChanges();
      tick(600);

      expect(tooltipPane(), 'a child tabbing away closed a tooltip the pointer is still holding open').toBeTruthy();
    });
  });
});

/**
 * Tab out of a click popover, both ways, from the keyboard alone.
 *
 * The pane renders at the end of `<body>`, nowhere near its trigger, so the
 * browser's own Tab walked out of it — Shift+Tab to the foot of the page, Tab
 * off the document — and left the dialog open behind the user with
 * `aria-expanded` still true. jsdom has no sequential navigation, so what is
 * asserted is the directive's half: where it puts focus, and whether it leaves
 * the move to the browser. The browser's half, forward Tab carrying on from the
 * trigger to the control after it, was measured in Chromium on the docs
 * header's Settings panel.
 *
 * No synchronous `detectChanges` after a keystroke: the close lands in a render
 * zoneless CD schedules, and painting by hand would hide one never scheduled.
 */
describe('WrPopover keyboard round trip', () => {
  @Component({
    imports: [WrPopover],
    template: `
      <button type="button" class="trigger" [wrPopover]="panel">Settings</button>
      <button type="button" class="after">After</button>

      <ng-template #panel>
        <button type="button" class="first">First</button>
        <button type="button" class="last">Last</button>
        <!-- Focusable, but parked out of the tab order the way a roving composite parks its other items. -->
        <button type="button" class="parked" tabindex="-1">Parked</button>
      </ng-template>
    `,
  })
  class TabHost {}

  let fixture: ReturnType<typeof TestBed.createComponent<TabHost>>;

  const outside = (cls: 'trigger' | 'after'): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`.${cls}`)!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popover-overlay');
  const inside = (cls: 'first' | 'last'): HTMLElement => pane()!.querySelector<HTMLElement>(`.${cls}`)!;

  /** Tab on `from`, focused first: a browser dispatches the keydown on whatever holds focus. */
  const tab = async (from: HTMLElement, shiftKey = false): Promise<KeyboardEvent> => {
    from.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    from.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };

  /** Enter on a `<button>`: focus on it, then a click with no pointer behind it. */
  const openFromKeyboard = async (): Promise<void> => {
    outside('trigger').focus();
    outside('trigger').click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    // jsdom lays nothing out, so `getFocusableElements` would drop every control
    // in the panel but the focused one as unrendered.
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TabHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('hands Tab off the last stop to the trigger, leaves the move to the browser, and closes', async () => {
    await openFromKeyboard();
    expect(document.activeElement).toBe(pane());

    // `.parked` follows it in the DOM and is not a stop.
    const event = await tab(inside('last'));

    expect(event.defaultPrevented, 'the browser would not carry on past the trigger').toBe(false);
    expect(document.activeElement).toBe(outside('trigger'));
    expect(pane()).toBeNull();
    expect(outside('trigger').getAttribute('aria-expanded')).toBe('false');
  });

  it('takes the pane out before the browser carries the Tab on', async () => {
    await openFromKeyboard();
    inside('last').focus();
    // No `whenStable()` in between: the browser moves focus right after this
    // dispatch, and a pane still attached then would catch a trigger that is the
    // last stop before the overlay container.
    inside('last').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    expect(pane()).toBeNull();
    expect(document.activeElement).toBe(outside('trigger'));
  });

  it('lands Shift+Tab off the first stop on the trigger itself, and closes', async () => {
    await openFromKeyboard();
    const event = await tab(inside('first'), true);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(outside('trigger'));
    expect(pane()).toBeNull();
  });

  it('treats the focused pane as the first stop', async () => {
    await openFromKeyboard();
    const event = await tab(pane()!, true);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(outside('trigger'));
    expect(pane()).toBeNull();
  });

  it('leaves Tab between the panel’s own stops to the browser', async () => {
    await openFromKeyboard();
    const fromPane = await tab(pane()!);
    const forward = await tab(inside('first'));
    const back = await tab(inside('last'), true);

    expect([fromPane, forward, back].map(e => e.defaultPrevented)).toEqual([false, false, false]);
    expect(pane()).not.toBeNull();
    expect(outside('trigger').getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when focus leaves for the page some other way, and leaves it there', async () => {
    await openFromKeyboard();
    outside('after').focus();
    await fixture.whenStable();

    expect(pane()).toBeNull();
    expect(document.activeElement, 'the close pulled focus back to the trigger').toBe(outside('after'));
  });

  it('stays open for focus on the trigger, and for an overlay stacked above it', async () => {
    await openFromKeyboard();
    // A press on the trigger focuses it before its click toggles the panel —
    // closing here would have that click open it straight back.
    outside('trigger').focus();
    await fixture.whenStable();
    expect(pane()).not.toBeNull();

    // A `wr-date-picker` or `wr-dropdown` inside the panel moves focus into a
    // pane of its own, later in the same container.
    const later = document.createElement('button');
    pane()!.parentElement!.parentElement!.appendChild(later);
    try {
      inside('first').focus();
      later.focus();
      await fixture.whenStable();
      expect(pane()).not.toBeNull();
    } finally {
      later.remove();
    }
  });

  /**
   * Chromium reports no destination when the window loses focus and when the
   * focused node is removed, and closing for either would shut a panel the user
   * is still in. Tab walking off the end of the document reports none too, and
   * that one is leaving — reached here through a stop the keydown check does
   * not recognise as the last one.
   */
  it('reads a focusout to nowhere as leaving only during a Tab', async () => {
    await openFromKeyboard();
    const first = inside('first');
    first.focus();

    first.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await fixture.whenStable();
    expect(pane(), 'a window blur closed the panel').not.toBeNull();

    // Same task as the keystroke, as the browser's own Tab would be.
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    first.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await fixture.whenStable();
    expect(pane()).toBeNull();
  });
});

/**
 * The CDK mirrors a connected position's anchors under `dir="rtl"` — a `start`
 * origin resolves to the trigger's right edge — but it adds `offsetX` to the
 * final PHYSICAL x without mirroring it. Left alone, the 8px that held a
 * side-placed panel clear of its trigger pulls it 8px INTO the trigger once the
 * panel has moved to the other side, which is why `wrMirrorOffsets` exists.
 */
describe('WrPopover under dir="rtl"', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popover-overlay');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: 'rtl', change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('turns the gap around, so the panel still sits clear of the trigger', () => {
    fixture.componentInstance.position.set('left');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.click-trigger')!.click();
    fixture.detectChanges();

    // The LTR twin of this case asserts translateX(-8px). Same placement, same
    // table, mirrored offset — an unmirrored one would read -8 here and overlap.
    expect(pane()?.getAttribute('style')).toContain('translateX(8px)');
  });

  it('leaves the block axis alone', () => {
    fixture.componentInstance.position.set('bottom');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.click-trigger')!.click();
    fixture.detectChanges();

    // `dir` governs the inline axis only: a panel below its trigger stays below.
    expect(pane()?.getAttribute('style')).toContain('translateY(8px)');
  });
});

/**
 * The flip chains, asserted as a TABLE rather than through a rendered panel.
 *
 * The defect they fix cannot be reproduced here and it would be dishonest to
 * pretend otherwise: jsdom measures every box as 0×0, so `_getOverlayFit` finds
 * that the first candidate fits perfectly and CDK never reaches a fallback. What
 * a unit test CAN hold is the shape of the table the browser then walks — that a
 * chain exists at all (twelve one-element arrays was the bug), that it leads with
 * what was asked for, that a side placement can reach the block axis, and that
 * every link is tagged with the class the arrow keys off.
 *
 * Measured in Chromium at 375×812 against the real `FlexibleConnectedPositionStrategy`:
 * `right-start` used to put its panel's right edge at 383 with `innerWidth` 375 —
 * 8px of border and corner clipped away, exactly the `offsetX` that `withPush`
 * emits as a transform after it has finished pushing. With the chain it flips to
 * `bottom-start` and lands at 375 with nothing off-screen.
 */
describe('WrPopover placement fallbacks', () => {
  const names = Object.keys(WR_POPOVER_POSITIONS) as WrPopoverPosition[];

  it('gives every placement somewhere to flip to', () => {
    for (const name of names) {
      const chain = WR_POPOVER_FALLBACKS[name];
      expect(chain.length, `${name} has no fallback`).toBeGreaterThan(1);
      expect(chain[0], `${name} does not lead with itself`).toBe(name);
      expect(new Set(chain).size, `${name} repeats a placement`).toBe(chain.length);
      for (const link of chain) expect(names, `${name} names a placement that does not exist`).toContain(link);
    }
  });

  it('keeps the requested alignment down the whole chain', () => {
    const alignment = (name: WrPopoverPosition): string => name.split('-')[1] ?? '';
    for (const name of names) {
      for (const link of WR_POPOVER_FALLBACKS[name]) expect(alignment(link)).toBe(alignment(name));
    }
  });

  it('lets a side placement reach the block axis, where a phone has the room', () => {
    // At 375px a 233px panel fits on NEITHER side of a mid-page trigger, so a
    // left/right chain that only offers the opposite side still has nowhere to go.
    for (const name of ['left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'] as const) {
      const chain = WR_POPOVER_FALLBACKS[name];
      expect(
        chain.some(link => link.startsWith('bottom')),
        `${name} cannot fall below`
      ).toBe(true);
      expect(
        chain.some(link => link.startsWith('top')),
        `${name} cannot fall above`
      ).toBe(true);
    }
  });

  it('never sends a block-axis placement sideways', () => {
    for (const name of ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end'] as const) {
      expect(WR_POPOVER_FALLBACKS[name].every(link => /^(top|bottom)/.test(link))).toBe(true);
    }
  });

  it('tags each link with the pane class its own arrow rule keys off', () => {
    // Without this the panel flips and the arrow stays behind, pointing at a side
    // the panel no longer sits on. The prefix is per mode: a tooltip's arrow is
    // drawn by `.wr-tooltip-overlay--<placement>`, a popover's by the other one.
    expect(wrPopoverPositions('right-start', 'wr-popover-overlay').map(p => p.panelClass)).toEqual([
      'wr-popover-overlay--right-start',
      'wr-popover-overlay--left-start',
      'wr-popover-overlay--bottom-start',
      'wr-popover-overlay--top-start',
    ]);
    expect(wrPopoverPositions('top', 'wr-tooltip-overlay').map(p => p.panelClass)).toEqual([
      'wr-tooltip-overlay--top',
      'wr-tooltip-overlay--bottom',
    ]);
  });

  it('carries the geometry of the placement each link names', () => {
    for (const name of names) {
      const resolved = wrPopoverPositions(name, 'wr-popover-overlay');
      WR_POPOVER_FALLBACKS[name].forEach((link, index) => {
        expect(resolved[index]).toEqual({ ...WR_POPOVER_POSITIONS[link], panelClass: `wr-popover-overlay--${link}` });
      });
    }
  });
});

/**
 * `exportAs` is the only way a template can reach the directive at all — without
 * it `#p="wrPopover"` is a compile error, not a silent `undefined`, so mounting
 * the host IS half the assertion. The other half is that the reference resolves
 * to the directive rather than to the element it sits on.
 */
describe('WrPopover template reference', () => {
  @Component({
    imports: [WrPopover],
    template: `
      <button type="button" [wrPopover]="panel" #ref="wrPopover">Details</button>
      <ng-template #panel>Body</ng-template>
    `,
  })
  class ExportHost {
    readonly popover = viewChild.required<WrPopover>('ref');
  }

  it('publishes the instance as `wrPopover`', () => {
    TestBed.resetTestingModule();

    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const popover = fixture.componentInstance.popover();
    expect(popover).toBeInstanceOf(WrPopover);
    expect(popover.isOpen()).toBe(false);

    fixture.destroy();
  });
});

/**
 * The CDK reads the direction ONCE, as a string, when the overlay is created
 * (`overlayConfig.direction ||= directionality.value`), writes it as the host's
 * `dir` on attach and never looks at it again — `updatePosition()` does not
 * touch it. So an app that flips while a panel is open mirrors the page and
 * leaves the panel behind, still `ltr` and still carrying the offsets
 * `wrMirrorOffsets` built for the direction it opened in. This site's own
 * LTR/RTL switch is the demonstration: it lives inside a menu, and the
 * `wr-segmented` it is drawn with reads `Directionality` live, so the thumb
 * slides to a slot the pane around it still lays out the other way.
 *
 * The real `Directionality` is flipped here rather than a `{ value, change }`
 * double, because the state IS `valueSignal` — `value` is a getter over it, and
 * the root instance emits `change` for nobody.
 */
describe('WrPopover when the direction flips while it is open', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let dir: Directionality;

  const pane = (): HTMLElement => document.querySelector<HTMLElement>('.wr-popover-overlay')!;
  /** `dir` goes on the host wrapper; `panelClass` lands on the pane inside it. */
  const paneDir = (): string | null => pane().parentElement!.getAttribute('dir');
  const clickTrigger = (): void => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.click-trigger')!.click();
    fixture.detectChanges();
  };

  const openAt = (position: WrPopoverPosition): void => {
    fixture.componentInstance.position.set(position);
    fixture.detectChanges();
    clickTrigger();
  };

  /** A signal write is state, not an event: it lands on the next change detection. */
  const flipTo = (direction: Direction): void => {
    dir.valueSignal.set(direction);
    TestBed.tick();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    dir = TestBed.inject(Directionality);
  });

  afterEach(() => fixture.destroy());

  it('rewrites the open panel’s own `dir`', () => {
    openAt('bottom');
    expect(paneDir()).toBe('ltr');

    flipTo('rtl');

    expect(paneDir()).toBe('rtl');
  });

  it('turns the gap around without waiting to be reopened', () => {
    openAt('left');
    // `left` hangs the panel 8px clear of the trigger's start edge.
    expect(pane().getAttribute('style')).toContain('translateX(-8px)');

    flipTo('rtl');

    // Mirrored in place. Left alone the -8 survives the flip, and a panel that
    // has just moved to the trigger's other side sits 8px ON TOP of it.
    expect(pane().getAttribute('style')).toContain('translateX(8px)');
  });

  it('gives a reopened panel a follower of its own', () => {
    openAt('left');
    clickTrigger();
    expect(document.querySelector('.wr-popover-overlay')).toBeNull();

    clickTrigger();
    flipTo('rtl');

    // Closing disposes the ref and takes its follower with it; reopening is a
    // new ref, so the second panel has to be wired again rather than inheriting.
    expect([paneDir(), pane().getAttribute('style')?.includes('translateX(8px)')]).toEqual(['rtl', true]);
  });

  it('follows the direction back again', () => {
    openAt('left');
    flipTo('rtl');

    // The waypoint is the whole test. A panel that follows nothing ends this
    // round trip in exactly the state it started in, so asserting only the
    // landing would pass on an unwired one — assert that it went somewhere
    // first.
    expect([paneDir(), pane().getAttribute('style')?.includes('translateX(8px)')]).toEqual(['rtl', true]);

    flipTo('ltr');

    // Nothing here is one-way: the mirror is rebuilt from the direction it is
    // handed, not toggled.
    expect([paneDir(), pane().getAttribute('style')?.includes('translateX(-8px)')]).toEqual(['ltr', true]);
  });
});
