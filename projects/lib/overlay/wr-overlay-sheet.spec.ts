import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideWrOverlay } from './provide-wr-overlay';
import { WR_OVERLAY } from './tokens/wr-overlay.token';

@Component({ template: 'sheet' })
class Sheet {}

/**
 * `.wr-overlay-sheet` lifts a bottom-pinned sheet clear of the on-screen
 * keyboard with `margin-bottom: var(--wr-keyboard-inset)`. This file pins the
 * one fact that makes that declaration need `!important` — dialog, select,
 * dropdown and popover all pin their sheet with the same global strategy.
 */
describe('the bottom-sheet pane', () => {
  let overlay: Overlay;
  const refs: OverlayRef[] = [];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    overlay = TestBed.inject(WR_OVERLAY);
  });

  afterEach(() => {
    for (const ref of refs.splice(0)) ref.dispose();
  });

  it('carries the sheet class and an INLINE margin-bottom on the same element', async () => {
    const ref = overlay.create({
      panelClass: 'wr-overlay-sheet',
      positionStrategy: overlay.position().global().centerHorizontally().bottom('0'),
    });
    refs.push(ref);
    ref.attach(new ComponentPortal(Sheet));
    // `attach()` defers the first `updatePosition()` into `afterNextRender`.
    await TestBed.inject(ApplicationRef).whenStable();

    const pane = ref.overlayElement;

    // `GlobalPositionStrategy.apply()` assigns `style.marginBottom` straight
    // from the `.bottom('0')` offset — onto the very element `panelClass`
    // lands on, and again on every `updatePosition()`.
    expect(pane.classList.contains('wr-overlay-sheet')).toBe(true);
    expect(pane.style.marginBottom).toBe('0px');
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * jsdom loads no stylesheets, so the cascade above cannot be observed here —
 * only the declaration can. Without `!important` the inline `margin-bottom: 0px`
 * the test above just recorded wins, and the keyboard lift computes to 0 no
 * matter how tall the keyboard is.
 */
describe('the overlay stylesheet', () => {
  const code = readFileSync(join(process.cwd(), 'projects/lib/overlay/styles/_index.scss'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('outranks the inline margin with the keyboard lift', () => {
    expect(code).toMatch(/margin-bottom:\s*var\(--wr-keyboard-inset[^;]*\)\s*!important;/);
  });

  /**
   * The sheet appearance has to reach the element that actually PAINTS it, and
   * for three of the four users that is the pane's child rather than the pane:
   * select, dropdown and popover portal a panel into a transparent pane, so the
   * full width and the squared-off bottom corners above land on a box nobody
   * sees. Measured in Chromium at 375x812 before this rule existed: the dropdown
   * menu was 160px and the popover panel 288px inside a 375px sheet, and all
   * three painted an 18.5px radius at the two corners sitting on the screen
   * edge, where `document.elementFromPoint` answered with the transparent pane.
   *
   * jsdom resolves no stylesheet and lays nothing out, so only the declaration
   * can be pinned here — the widths and the corner pixels are a browser check.
   */
  it('stretches the sheet child and squares the corners on the screen edge', () => {
    const rule = /\.wr-overlay-sheet\s*>\s*\*:not\(\.wr-dialog__close\)\s*\{([^}]*)\}/.exec(code)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width:\s*100%\s*!important;/);
    expect(rule).toMatch(/max-width:\s*100%\s*!important;/);
    expect(rule).toMatch(/border-bottom-left-radius:\s*0\s*!important;/);
    expect(rule).toMatch(/border-bottom-right-radius:\s*0\s*!important;/);
  });

  /**
   * …and the exclusion is the load-bearing half. `.wr-dialog__close` is a DIRECT
   * child of the dialog's pane — the one sheet whose pane is the panel — so a
   * blanket `> *` would stretch the 24px dismiss button across the sheet and
   * square its bottom corners.
   */
  it('leaves the dialog dismiss button out of it', () => {
    expect(code).not.toMatch(/\.wr-overlay-sheet\s*>\s*\*\s*\{/);
  });
});
