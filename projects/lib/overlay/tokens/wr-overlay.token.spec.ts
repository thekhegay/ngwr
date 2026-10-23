import { Overlay, OverlayContainer, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrOverlayContainer } from '../wr-overlay-container';

import { WR_OVERLAY_CONTAINER } from './wr-overlay-container.token';
import { WR_OVERLAY } from './wr-overlay.token';

@Component({ template: '<p class="pane-body">panel</p>' })
class Pane {}

/**
 * Isolation is the default, not a provider an app has to remember: with
 * nothing configured, an NGWR overlay lands in its own `.wr-overlay-container`,
 * and CDK's root container — the one Angular Material and NG-ZORRO open into —
 * is a different element that NGWR never writes to or removes.
 *
 * Both are read by identity rather than by a document query, since the two
 * elements carry the same `.cdk-overlay-container` class.
 */
describe('WR_OVERLAY', () => {
  const refs: OverlayRef[] = [];

  afterEach(() => {
    for (const ref of refs.splice(0)) ref.dispose();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('renders into the NGWR container with nothing provided', () => {
    const ref = TestBed.inject(WR_OVERLAY).create();
    refs.push(ref);
    ref.attach(new ComponentPortal(Pane));
    TestBed.tick();

    const container = TestBed.inject(WR_OVERLAY_CONTAINER);
    const element = container.getContainerElement();

    expect(container).toBeInstanceOf(WrOverlayContainer);
    expect(element.classList.contains('wr-overlay-container')).toBe(true);
    expect(ref.hostElement.parentElement).toBe(element);
    expect(element.querySelector('.pane-body')?.textContent).toBe('panel');
  });

  it("leaves CDK's root Overlay and OverlayContainer to everyone else", () => {
    const ngwr = TestBed.inject(WR_OVERLAY);
    const cdk = TestBed.inject(Overlay);
    const ngwrRef = ngwr.create();
    const cdkRef = cdk.create();
    refs.push(ngwrRef, cdkRef);

    const root = TestBed.inject(OverlayContainer);
    const rootElement = root.getContainerElement();

    expect(ngwr).not.toBe(cdk);
    expect(root).not.toBeInstanceOf(WrOverlayContainer);
    expect(rootElement.classList.contains('wr-overlay-container')).toBe(false);
    expect(cdkRef.hostElement.parentElement).toBe(rootElement);
    expect(ngwrRef.hostElement.parentElement).not.toBe(rootElement);
    expect(ngwrRef.hostElement.parentElement).toBe(TestBed.inject(WR_OVERLAY_CONTAINER).getContainerElement());
  });

  it("measures a connected position against the NGWR container, never creating CDK's", () => {
    const overlay = TestBed.inject(WR_OVERLAY);
    const origin = document.body.appendChild(document.createElement('button'));
    const ref = overlay.create({
      positionStrategy: overlay
        .position()
        .flexibleConnectedTo(origin)
        .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }]),
    });
    refs.push(ref);
    ref.attach(new ComponentPortal(Pane));
    ref.updatePosition();
    TestBed.tick();

    const rootStamped = [...document.querySelectorAll('.cdk-overlay-container')].filter(
      element => !element.classList.contains('wr-overlay-container')
    );
    expect(rootStamped).toEqual([]);
    origin.remove();
  });

  // Under Karma, Jasmine, Jest or Mocha, CDK stamps its container
  // `platform="test"` and, creating one, removes every container so stamped.
  // Vitest defines none of those globals, so one is stubbed to reach that path.
  it.each(['ngwr', 'cdk'] as const)('keeps both containers attached in a CDK test runner, %s first', first => {
    vi.stubGlobal('jasmine', {});
    const ngwr = (): HTMLElement => TestBed.inject(WR_OVERLAY_CONTAINER).getContainerElement();
    const cdk = (): HTMLElement => TestBed.inject(OverlayContainer).getContainerElement();
    const [a, b] = first === 'ngwr' ? [ngwr(), cdk()] : [cdk(), ngwr()];

    expect(a).not.toBe(b);
    expect([a.isConnected, b.isConnected]).toEqual([true, true]);
  });
});
