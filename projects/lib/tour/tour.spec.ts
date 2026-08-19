import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrTourStep } from './interfaces';
import { WrTour } from './tour';

@Component({
  template: `<div id="one">one</div>
    <div id="two">two</div>
    <button type="button" id="opener">Tour</button>`,
})
class Host {}

/**
 * `WrTour` is a root service that mounts a popup into a CDK overlay, so the card
 * is queried off the document rather than the fixture. It also reaches outside
 * both: the cut-out is a bare div appended to `document.body`, and Escape is bound
 * on the document — which makes teardown a contract in its own right, not an
 * implementation detail.
 */
describe('WrTour', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let tour: WrTour;
  let traps: { destroy: ReturnType<typeof vi.fn> }[];
  let createTrap: ReturnType<typeof vi.fn>;

  const STEPS: readonly WrTourStep[] = [
    { target: '#one', title: 'First', content: 'Look here' },
    { target: '#two', content: 'Then here' },
  ];

  const popup = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-tour-popup');
  const spotlight = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-tour__spotlight');
  const progress = (): string => popup()!.querySelector('.wr-tour-popup__progress')!.textContent.trim();
  const title = (): string | null => popup()!.querySelector('.wr-tour-popup__title')?.textContent?.trim() ?? null;
  const actionLabels = (): string[] =>
    [...popup()!.querySelectorAll('.wr-tour-popup__actions button')].map(el => el.textContent.trim());
  const sync = (): void => fixture.detectChanges();

  const escape = (init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init });
    document.dispatchEvent(event);
    sync();
    return event;
  };

  beforeEach(() => {
    // jsdom implements no `scrollIntoView`, and the tour calls it on every step's
    // target — production code should not carry a guard for a test environment.
    Element.prototype.scrollIntoView = (): undefined => undefined;
    traps = [];
    createTrap = vi.fn(() => {
      const trap = { destroy: vi.fn(), focusInitialElementWhenReady: () => Promise.resolve(true) };
      traps.push(trap);
      return trap;
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), { provide: ConfigurableFocusTrapFactory, useValue: { create: createTrap } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    tour = TestBed.inject(WrTour);
  });

  afterEach(() => {
    tour.stop();
    fixture.destroy();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('sits idle until it is started', () => {
    expect(tour.active()).toBe(false);
    expect(tour.index()).toBe(-1);
    expect(tour.total()).toBe(0);
    expect(tour.step()).toBeNull();
    expect(popup()).toBeNull();
  });

  it('opens the first step as a named modal card with a cut-out', () => {
    tour.start(STEPS);
    sync();

    expect(tour.active()).toBe(true);
    expect(popup()!.getAttribute('role')).toBe('dialog');
    expect(popup()!.getAttribute('aria-modal')).toBe('true');
    // The name carries both the step title and where the user is.
    expect(popup()!.getAttribute('aria-label')).toBe('First — Step 1 of 2');
    expect(title()).toBe('First');
    expect(progress()).toBe('Step 1 of 2');

    expect(spotlight()).not.toBeNull();
    expect(spotlight()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('walks forward and back, and finishes past the end', () => {
    tour.start(STEPS);
    sync();
    expect(actionLabels()).toEqual(['Skip tour', 'Next']);

    tour.next();
    sync();
    expect(progress()).toBe('Step 2 of 2');
    expect(title()).toBeNull();
    expect(actionLabels()).toEqual(['Skip tour', 'Back', 'Done']);

    tour.prev();
    sync();
    expect(tour.index()).toBe(0);

    tour.next();
    tour.next();
    sync();
    expect(tour.active()).toBe(false);
    expect(popup()).toBeNull();
    expect(spotlight()).toBeNull();
  });

  it('stays put when asked to go back from the first step', () => {
    tour.start(STEPS);
    tour.prev();
    sync();
    expect(tour.index()).toBe(0);
  });

  it('skips a step whose target is not in the document', () => {
    tour.start([STEPS[0], { target: '#nowhere', content: 'gone' }, STEPS[1]]);
    sync();
    expect(tour.index()).toBe(0);

    tour.next();
    sync();
    // Straight past the missing one rather than showing a card pointing at nothing.
    expect(tour.index()).toBe(2);
    expect(progress()).toBe('Step 3 of 3');
  });

  it('offers Done on the last REACHABLE step', () => {
    // The primary button used to read "Next" here and then end the tour when
    // pressed, because `isLast` compared against the raw step count and the
    // trailing step could never be shown.
    tour.start([STEPS[0], { target: '#nowhere', content: 'gone' }]);
    sync();

    expect(tour.index()).toBe(0);
    expect(actionLabels()).toEqual(['Skip tour', 'Done']);
  });

  it('offers no Back on the first REACHABLE step', () => {
    // The mirror of the case above. A leading step whose target is missing gets
    // skipped, so the tour opens on index 1 — and `isFirst` compared against the
    // raw index, putting a Back button on the very first card the user sees. It
    // did nothing at all: `prev()` walks off the start and returns without moving.
    tour.start([{ target: '#nowhere', content: 'gone' }, STEPS[1]]);
    sync();

    expect(tour.index()).toBe(1);
    expect(actionLabels()).toEqual(['Skip tour', 'Done']);
  });

  it('closes on Escape', () => {
    tour.start(STEPS);
    sync();
    const event = escape();

    expect(event.defaultPrevented).toBe(true);
    expect(tour.active()).toBe(false);
    expect(popup()).toBeNull();
  });

  it('leaves an Escape that something else already handled alone', () => {
    // A tour step can sit inside a dialog, and the tour's listener is on the
    // document — without this guard one Escape closed both.
    tour.start(STEPS);
    sync();

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    document.dispatchEvent(event);
    sync();

    expect(tour.active()).toBe(true);
  });

  it('hands focus back to whatever opened it', () => {
    const opener = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();

    tour.start(STEPS);
    sync();
    tour.stop();
    sync();

    expect(document.activeElement).toBe(opener);
  });

  it('destroys each step trap instead of stacking them up', () => {
    // The trap was created into a local and never destroyed, so every step left a
    // live `FocusTrapManager` registration and a capture-phase document focus
    // listener behind it — one per step, for the life of the page.
    tour.start(STEPS);
    sync();
    tour.next();
    sync();
    tour.stop();
    sync();

    expect(createTrap).toHaveBeenCalledTimes(2);
    expect(traps.every(trap => trap.destroy.mock.calls.length === 1)).toBe(true);
  });

  it('restarts cleanly rather than stacking overlays', () => {
    tour.start(STEPS);
    sync();
    tour.start(STEPS);
    sync();

    expect(document.querySelectorAll('.wr-tour-popup').length).toBe(1);
    expect(document.querySelectorAll('.wr-tour__spotlight').length).toBe(1);
  });

  it('does nothing when handed an empty list', () => {
    tour.start([]);
    sync();
    expect(tour.active()).toBe(false);
    expect(popup()).toBeNull();
  });
});

describe('WrTour when its injector goes away mid-tour', () => {
  it('takes the cut-out and the document listener with it', () => {
    Element.prototype.scrollIntoView = (): undefined => undefined;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    TestBed.inject(WrTour).start([{ target: '#one', content: 'Look here' }]);
    fixture.detectChanges();
    expect(document.querySelector('.wr-tour__spotlight')).not.toBeNull();

    // A root service with no destroy hook leaves its body node and its document
    // keydown listener behind — in a test run that means the next file inherits them.
    TestBed.resetTestingModule();

    expect(document.querySelector('.wr-tour__spotlight')).toBeNull();
    expect(document.querySelector('.wr-tour-popup')).toBeNull();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * The cut-out and CDK's `.cdk-overlay-container` are both `position: fixed` children
 * of `<body>`, so at equal z-index the DOM order decides who paints on top — and the
 * service appends a fresh cut-out on every step while the container stays where it
 * is. From the second step on, the dimming shadow covered the tour's own card.
 * `.wr-tour-overlay { z-index: 1001 }` cannot fix it: that sits on the pane INSIDE
 * the container, whose stacking context scopes it.
 *
 * jsdom paints nothing, and the dimming is a `box-shadow`, which is not hit-testable
 * even in a real browser — so it was measured in Chromium by giving the same element
 * a solid background over the card (same element, same stacking position) and asking
 * `elementFromPoint` who won:
 *
 *   cut-out before the container (step 1) | card wins | card wins
 *   cut-out after  the container (step 2) | CUT-OUT   | card wins
 *                                           z 1000      z 999
 */
describe('the tour stylesheet', () => {
  const source = readFileSync(join(process.cwd(), 'projects/lib/tour/styles/_index.scss'), 'utf8');
  const code = source
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('keeps the cut-out under the overlay container it shares a parent with', () => {
    const rule = /\.wr-tour__spotlight\s*\{([\s\S]*?)\n\}/.exec(code)?.[1] ?? '';
    const z = /z-index:\s*(\d+)/.exec(rule)?.[1];
    expect(z).toBeDefined();
    expect(Number(z)).toBeLessThan(1000);
  });
});
