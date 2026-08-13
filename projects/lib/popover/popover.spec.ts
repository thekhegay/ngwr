import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrPopoverPosition } from './interfaces';
import { WrPopover } from './popover';

/**
 * `[wrPopover]` renders its panel into a CDK overlay, so nothing it opens is
 * reachable from the fixture — every query for a panel goes through the
 * document. `provideWrOverlay()` keeps that container isolated so it cannot
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

    <ng-template #panel>
      <p class="panel-body">Anything you can render.</p>
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

describe('WrPopover', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (kind: 'click' | 'hover' | 'tip'): HTMLButtonElement =>
    root().querySelector<HTMLButtonElement>(`.${kind}-trigger`)!;

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

  const press = (key: string, target: EventTarget = document.body): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
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
      // `provideWrOverlay()` exists so ngwr panels cannot land in the same
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

    it('opens on focus, so keyboard users get the same hint', () => {
      trigger('tip').dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();
      tick(120);

      expect(tooltipPane()).toBeTruthy();
    });

    it('hides after the hide delay on blur', () => {
      trigger('tip').dispatchEvent(new FocusEvent('focus'));
      tick(120);

      trigger('tip').dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();
      tick(59);
      expect(tooltipPane()).toBeTruthy();

      tick(1);
      expect(tooltipPane()).toBeNull();
      expect(trigger('tip').getAttribute('aria-describedby')).toBeNull();
    });

    it('hides after the pointer leaves', () => {
      enter(trigger('tip'));
      tick(120);

      leave(trigger('tip'));
      tick(60);
      expect(tooltipPane()).toBeNull();
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
      providers: [
        provideWrOverlay(),
        { provide: Directionality, useValue: { value: 'rtl', change: new Subject<Direction>() } },
      ],
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

/** A popover and a tooltip on one page, both asking for the sheet presentation. */
@Component({
  imports: [WrPopover],
  template: `
    <button type="button" class="sheet-trigger" [wrPopover]="panel" [responsive]="responsive()">Details</button>
    <button type="button" class="sheet-tip" wrPopover="Save" mode="tooltip" [responsive]="true">Save</button>
    <ng-template #panel>Panel body</ng-template>
  `,
})
class SheetHost {
  readonly responsive = signal<boolean | undefined>(true);
}

/**
 * Sheet presentation is popover-only, and the reason is in the component: a tooltip
 * is a transient label that follows its trigger, and docking one to the bottom of the
 * viewport would leave a caption floating a screen away from the thing it captions.
 * That exclusion is a `!tooltip &&` in one expression, which is exactly the kind of
 * condition that gets simplified away — so both halves are asserted here.
 *
 * Everything the sheet changes is an overlay OPTION rather than a stylesheet rule, so
 * a unit test sees all of it: the panel class, the backdrop, and the position
 * modifier that disappears once the panel stops being anchored to anything.
 */
describe('WrPopover as a bottom sheet', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SheetHost>>;
  const width = Object.getOwnPropertyDescriptor(window, 'innerWidth');

  const click = (selector: string): void => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector)!.click();
    fixture.detectChanges();
  };
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popover-overlay');

  const mount = (viewport: number): void => {
    Object.defineProperty(window, 'innerWidth', { value: viewport, configurable: true });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SheetHost);
    fixture.detectChanges();
  };

  // The tooltip case waits out a show delay, which is a real timer here.
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    if (width) Object.defineProperty(window, 'innerWidth', width);
  });

  it('slides the panel up from the bottom on a narrow viewport', () => {
    mount(390);
    click('.sheet-trigger');

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(true);
    // No `--<position>` modifier: there is no trigger to be positioned against.
    expect(pane()!.className).not.toContain('wr-popover-overlay--');
    expect(document.querySelector('.cdk-overlay-backdrop')?.classList).toContain('wr-overlay-backdrop');
  });

  it('closes when the backdrop is tapped', () => {
    mount(390);
    click('.sheet-trigger');

    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    fixture.detectChanges();

    expect(pane()).toBeNull();
  });

  it('leaves a TOOLTIP anchored, however narrow the viewport', () => {
    mount(390);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.sheet-tip')!
      .dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    const tip = document.querySelector<HTMLElement>('.wr-tooltip-overlay');
    expect(tip).not.toBeNull();
    expect(tip!.classList.contains('wr-overlay-sheet')).toBe(false);
    expect(tip!.className).toContain('wr-tooltip-overlay--');
  });

  it('stays anchored on a wide viewport', () => {
    mount(1280);
    click('.sheet-trigger');

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(false);
    expect(pane()!.className).toContain('wr-popover-overlay--');
  });

  it('never becomes a sheet when the trigger opted out', () => {
    mount(390);
    fixture.componentInstance.responsive.set(false);
    fixture.detectChanges();
    click('.sheet-trigger');

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(false);
  });
});
