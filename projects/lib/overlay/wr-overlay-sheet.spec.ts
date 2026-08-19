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
});
