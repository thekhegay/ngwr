import { Directionality } from '@angular/cdk/bidi';
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPopconfirm } from './popconfirm';
import { WR_POPCONFIRM_FALLBACKS, type WrPopconfirmPosition } from './types';

@Component({
  imports: [WrPopconfirm],
  template: `
    <button
      type="button"
      [wrPopconfirm]="message()"
      (confirmed)="log.push('confirmed')"
      (cancelled)="log.push('cancelled')"
    >
      Delete
    </button>
    <button type="button" id="elsewhere">Something else</button>
  `,
})
class Host {
  readonly message = signal('Delete this for good?');
  readonly log: string[] = [];
}

/**
 * A real window for the CDK to place panels in, for every case in the file — the
 * same stub `popover.spec.ts` carries, for the same reason. jsdom reports
 * `<html>`, the box the CDK measures the viewport by, as 0×0, and the viewport
 * margin narrows that to a NEGATIVE one, where nothing fits and a `left` panel is
 * sent to the right.
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

/**
 * A popconfirm is a confirmation dialog that happens to be anchored to its
 * trigger, and everything about its contract follows from that: the panel is the
 * ONLY way to confirm or cancel, so a keyboard user has to be able to reach it.
 * The panel lives in the CDK overlay container, not in the fixture, so it is
 * queried off the document — and that container belongs to the TestBed's root
 * injector, so it never outlives this file.
 */
describe('WrPopconfirm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popconfirm');
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popconfirm-overlay');
  const buttons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-popconfirm wr-btn')];
  const cancel = (): HTMLElement => buttons()[0];
  const confirm = (): HTMLElement => buttons()[1];
  const log = (): string[] => fixture.componentInstance.log;

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const open = (): void => {
    click(trigger());
  };

  const elsewhere = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#elsewhere')!;

  /** `WrOutsideClick` judges by where the PRESS started, so both halves are needed. */
  const clickOutside = (target: HTMLElement): void => {
    for (const type of ['pointerdown', 'click']) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1 }));
    }
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('advertises the dialog it is about to open', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('opens a named dialog that describes what it is asking', () => {
    // An unnamed `role="dialog"` announces as a bare "dialog" and trips axe's
    // `aria-dialog-name`; without `aria-describedby` the question itself is never
    // read out, which is the whole content of a confirmation.
    open();

    expect(pane()!.getAttribute('role')).toBe('dialog');
    expect(pane()!.getAttribute('aria-modal')).toBe('false');
    expect(pane()!.getAttribute('aria-label')).toBeTruthy();

    const describedBy = pane()!.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)!.textContent.trim()).toBe('Delete this for good?');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('moves focus into the panel, landing on the safe choice', () => {
    // Focus used to stay on the trigger, and the overlay container sits at the end
    // of `<body>` — so Tab went to the next thing on the PAGE and the only way to
    // confirm was unreachable. Cancel first, because the action being confirmed is
    // usually the destructive one.
    open();
    expect(document.activeElement).toBe(cancel());
  });

  it('takes Escape from wherever the focus happens to be', () => {
    // Worth pinning that this does NOT depend on focus: `overlayRef.keydownEvents()`
    // is fed by CDK's `OverlayKeyboardDispatcher`, which keeps one listener on the
    // document and routes to the topmost overlay. So Escape reaches the panel even
    // from `<body>` — a plausible reading of the code says otherwise.
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(log()).toEqual(['cancelled']);
  });

  it('hands focus back to the trigger when it closes', () => {
    open();
    click(cancel());
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('confirms, and closes', () => {
    open();
    click(confirm());

    expect(log()).toEqual(['confirmed']);
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('cancels, and closes', () => {
    open();
    click(cancel());
    expect(log()).toEqual(['cancelled']);
  });

  it('toggles shut on a second press of the trigger', () => {
    open();
    expect(panel()).not.toBeNull();
    open();
    expect(panel()).toBeNull();
  });

  it('dismisses on a click outside', () => {
    open();
    clickOutside(elsewhere());
    expect(panel()).toBeNull();
    expect(log()).toEqual(['cancelled']);
  });

  it('leaves focus where the user put it when they close it by leaving', () => {
    // The counterpart of handing focus back: if the panel is dismissed by a click
    // somewhere else, focus belongs to whatever the user just reached for. Taking it
    // back to the trigger would be stealing.
    open();
    elsewhere().focus();
    expect(document.activeElement).toBe(elsewhere());

    clickOutside(elsewhere());
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(elsewhere());
  });

  it('takes the panel with it when the trigger is destroyed', () => {
    open();
    fixture.destroy();
    expect(panel()).toBeNull();
  });

  /**
   * The panel is non-modal, so Tab is not trapped — but it must not walk out and
   * strand the question open behind it. The pane sits at the end of `<body>`, so
   * Tab past Confirm went to `<body>` and on to the top of the page, and
   * Shift+Tab before Cancel to the foot of it, each with `aria-expanded` still
   * true.
   */
  const tab = (from: HTMLElement, shiftKey = false): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    from.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  it('closes when Tab leaves past the last button, and lets the browser move on from the trigger', () => {
    open();
    confirm().focus();
    const event = tab(confirm());

    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(log()).toEqual(['cancelled']);
    // Focus is on the trigger and the default is left alone, so the browser's own
    // Tab carries on to whatever follows the trigger in the page.
    expect(document.activeElement).toBe(trigger());
    expect(event.defaultPrevented).toBe(false);
  });

  it('closes when Shift+Tab leaves before the first button, landing on the trigger', () => {
    open();
    const event = tab(cancel(), true);

    expect(panel()).toBeNull();
    expect(log()).toEqual(['cancelled']);
    expect(document.activeElement).toBe(trigger());
    expect(event.defaultPrevented).toBe(true);
  });

  it('stays open while Tab moves between its own buttons', () => {
    open();
    const event = tab(cancel());

    expect(panel()).not.toBeNull();
    expect(event.defaultPrevented).toBe(false);
    expect(log()).toEqual([]);
  });

  it('closes when focus moves out by any other road, and leaves it there', () => {
    open();
    elsewhere().focus();
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(log()).toEqual(['cancelled']);
    expect(document.activeElement).toBe(elsewhere());
  });
});

@Component({
  imports: [WrPopconfirm],
  template: `<button type="button" wrPopconfirm="Удалить?">Удалить</button>`,
})
class RussianHost {}

/**
 * The catalog has carried `popconfirm.confirm` / `popconfirm.cancel` — translated —
 * for as long as the component has existed, and nothing read them: the two labels
 * were hard-coded English input defaults, so a Russian app showed English buttons
 * with the right translation sitting one file away.
 */
describe('WrPopconfirm under a localized catalog', () => {
  it('takes its button labels from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(RussianHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();

    const labels = [...document.querySelectorAll('.wr-popconfirm wr-btn')].map(el => el.textContent.trim());
    expect(labels).toEqual(['Отмена', 'Подтвердить']);

    fixture.destroy();
  });
});

/**
 * `exportAs` is what makes `#confirm="wrPopconfirm"` legal — without it the
 * template does not compile at all, so mounting the host is half the assertion and
 * the reference resolving to the directive is the other half.
 */
describe('WrPopconfirm template reference', () => {
  @Component({
    imports: [WrPopconfirm],
    template: `<button type="button" wrPopconfirm="Delete this?" #ref="wrPopconfirm">Delete</button>`,
  })
  class ExportHost {
    readonly popconfirm = viewChild.required<WrPopconfirm>('ref');
  }

  it('publishes the instance as `wrPopconfirm`', () => {
    TestBed.resetTestingModule();

    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const popconfirm = fixture.componentInstance.popconfirm();
    expect(popconfirm).toBeInstanceOf(WrPopconfirm);
    expect(popconfirm.isOpen()).toBe(false);

    fixture.destroy();
  });
});

/**
 * A panel anchored to its trigger has TWO things that depend on the reading
 * direction, and the CDK freezes both when the overlay is created: the `dir` it
 * writes on the host, and the offsets this component mirrored by hand at open.
 * So an app that flips while the question is on screen leaves the panel in the
 * old direction — and `offsetX` is added to the final PHYSICAL x, so the 8px
 * gap the panel keeps clear of its trigger becomes an 8px OVERLAP over the very
 * control it is asking about.
 *
 * `position="left"` is the shape that shows it. The default `top` offsets along
 * the block axis only, and the block axis does not flip.
 */
describe('WrPopconfirm across a direction flip', () => {
  /**
   * The side is BOUND rather than written as an attribute because one of these
   * tests rewrites it while the panel is open. The others leave it where it
   * starts, and a binding nobody writes renders exactly as the attribute did.
   */
  @Component({
    imports: [WrPopconfirm],
    template: `<button type="button" wrPopconfirm="Delete this for good?" [position]="side()">Delete</button>`,
  })
  class SideHost {
    readonly side = signal<WrPopconfirmPosition>('left');
  }

  let fixture: ReturnType<typeof TestBed.createComponent<SideHost>>;
  let ambient: Directionality;

  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-popconfirm-overlay');

  /**
   * Everything the CDK wrote about where this panel sits: the direction on the
   * host wrapper, the edge the bounding box is pinned to, and the inline offset
   * on the pane — which is the mirrored `offsetX` and nothing else.
   */
  const placement = (): Record<string, string | null> => ({
    dir: pane()!.parentElement!.getAttribute('dir'),
    left: pane()!.parentElement!.style.left,
    right: pane()!.parentElement!.style.right,
    offset: pane()!.style.transform,
  });

  const open = (): void => {
    (fixture.nativeElement as HTMLElement)
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const flipTo = (direction: 'ltr' | 'rtl'): void => {
    ambient.valueSignal.set(direction);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    ambient = TestBed.inject(Directionality);
    fixture = TestBed.createComponent(SideHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('rewrites the direction and re-mirrors the gap it keeps from the trigger', () => {
    open();
    expect(placement()).toEqual({ dir: 'ltr', left: 'auto', right: '1024px', offset: 'translateX(-8px)' });

    flipTo('rtl');

    // The sign is the assertion: the panel has moved to the other side of the
    // trigger, so the 8px has to point the other way with it.
    expect(placement()).toEqual({ dir: 'rtl', left: '0px', right: 'auto', offset: 'translateX(8px)' });
  });

  it('lands exactly where a panel opened after the flip lands', () => {
    open();
    flipTo('rtl');
    const followed = placement();
    fixture.destroy();

    // The same panel opened with the app ALREADY mirrored — the placement the
    // CDK computes from scratch, and the only definition of correct here that
    // does not restate the arithmetic under test.
    fixture = TestBed.createComponent(SideHost);
    fixture.detectChanges();
    open();

    expect(followed).toEqual(placement());
  });

  it('keeps the side it opened on when `position` was rebound behind it', () => {
    open();
    fixture.componentInstance.side.set('right');
    fixture.detectChanges();

    // Rebinding an open panel moves nothing — the side is read once, at open,
    // and so is the `--left` modifier the stylesheet hangs the arrow off.
    expect(placement()).toEqual({ dir: 'ltr', left: 'auto', right: '1024px', offset: 'translateX(-8px)' });

    flipTo('rtl');

    // So the flip must not smuggle the new side in either. Mirroring `right`
    // here would swing the panel across to the other edge of the trigger while
    // its class still said `--left`: the arrow on one side, the panel on the
    // other. This is the RTL placement of `left`, the same one the first test
    // pins.
    expect(pane()!.className).toContain('wr-popconfirm-overlay--left');
    expect(placement()).toEqual({ dir: 'rtl', left: '0px', right: 'auto', offset: 'translateX(8px)' });
  });

  it('gives a reopened panel a follower of its own', () => {
    open();
    (fixture.nativeElement as HTMLElement)
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
    expect(pane()).toBeNull();

    // `dispose()` nulls the element `setDirection()` writes through, so a
    // follower left behind by the panel that closed throws on this line.
    flipTo('rtl');
    open();
    flipTo('ltr');

    expect(placement()).toEqual({ dir: 'ltr', left: 'auto', right: '1024px', offset: 'translateX(-8px)' });
  });
});

/**
 * The side asked for is a preference, not a promise: with no room there the
 * panel flips, as `wr-popover` and `wr-dropdown` do. jsdom has no layout, so the
 * geometry the CDK measures is stubbed — the trigger and the pane, nothing else.
 */
describe('WrPopconfirm placement fallbacks', () => {
  @Component({
    imports: [WrPopconfirm],
    template: `<button type="button" wrPopconfirm="Delete this for good?" [position]="side()">Delete</button>`,
  })
  class SideHost {
    readonly side = signal<WrPopconfirmPosition>('top');
  }

  const rect = (left: number, top: number, width: number, height: number): DOMRect =>
    ({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height }) as DOMRect;

  let fixture: ReturnType<typeof TestBed.createComponent<SideHost>>;
  let triggerRect: DOMRect;

  const pane = (): HTMLElement => document.querySelector<HTMLElement>('.wr-popconfirm-overlay')!;

  const openAt = (side: WrPopconfirmPosition, at: DOMRect): void => {
    triggerRect = at;
    fixture.componentInstance.side.set(side);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SideHost);
    fixture.detectChanges();
    // Everything else keeps jsdom's own answer, a 0×0 box at the origin.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.matches('.wr-popconfirm-trigger')) return triggerRect;
      // The size the demo's panel renders at.
      if (this.matches('.wr-popconfirm-overlay')) return rect(0, 0, 224, 88);
      return rect(0, 0, 0, 0);
    });
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('flips below a `top` trigger that sits too close to the top of the viewport', () => {
    // 10px from the top: a 88px panel above it would start at -86.
    openAt('top', rect(400, 10, 56, 30));

    expect(pane().classList).toContain('wr-popconfirm-overlay--bottom');
    expect(pane().classList).not.toContain('wr-popconfirm-overlay--top');
  });

  it('moves a `right` panel to the other side when the right edge has no room', () => {
    // jsdom's viewport is 1024px wide; a 224px panel right of x=1000 cannot fit.
    openAt('right', rect(900, 300, 100, 30));

    expect(pane().classList).toContain('wr-popconfirm-overlay--left');
    expect(pane().classList).not.toContain('wr-popconfirm-overlay--right');
  });

  it('keeps the side it was asked for when there is room', () => {
    openAt('top', rect(400, 300, 56, 30));

    expect(pane().classList).toContain('wr-popconfirm-overlay--top');
  });

  it('gives every side somewhere to flip to, leading with itself', () => {
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const chain = WR_POPCONFIRM_FALLBACKS[side];
      expect(chain[0]).toBe(side);
      expect(chain.length).toBeGreaterThan(1);
    }
  });
});
