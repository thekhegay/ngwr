import { type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { WR_OVERLAY } from './tokens/wr-overlay.token';
import { wrFollowSize } from './wr-follow-size';

@Component({ template: '<p>panel</p>' })
class Pane {}

/** Records what was observed, and lets a case fire the callback by hand. */
class StubObserver {
  static instances: StubObserver[] = [];
  observed: Element[] = [];
  connected = true;
  constructor(public readonly callback: () => void) {
    StubObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  disconnect(): void {
    this.connected = false;
  }
}

describe('wrFollowSize', () => {
  const refs: OverlayRef[] = [];

  const openPane = (): OverlayRef => {
    const ref = TestBed.inject(WR_OVERLAY).create();
    ref.attach(new ComponentPortal(Pane));
    TestBed.tick();
    refs.push(ref);
    return ref;
  };

  afterEach(() => {
    for (const ref of refs.splice(0)) ref.dispose();
    StubObserver.instances = [];
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('repositions each time the pane changes size', () => {
    vi.stubGlobal('ResizeObserver', StubObserver);
    const ref = openPane();
    const reposition = vi.spyOn(ref, 'updatePosition');
    wrFollowSize(ref);

    const [observer] = StubObserver.instances;
    expect(observer.observed).toEqual([ref.overlayElement]);

    observer.callback();
    observer.callback();
    expect(reposition).toHaveBeenCalledTimes(2);
  });

  it('stops observing once the overlay detaches', () => {
    vi.stubGlobal('ResizeObserver', StubObserver);
    const ref = openPane();
    wrFollowSize(ref);

    ref.detach();
    expect(StubObserver.instances[0].connected).toBe(false);
  });

  it('does nothing where there is no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const ref = openPane();
    expect(() => wrFollowSize(ref)()).not.toThrow();
  });
});
