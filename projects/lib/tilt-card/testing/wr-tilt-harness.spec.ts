import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { WrTilt, WrTiltCard } from 'ngwr/tilt-card';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTiltHarness } from './wr-tilt-harness';

@Component({
  imports: [WrTiltCard],
  template: `
    <wr-tilt-card [maxTilt]="maxTilt()" [perspective]="perspective()" [scale]="scale()" [glare]="glare()">
      <p class="body">Card</p>
    </wr-tilt-card>
  `,
})
class Host {
  readonly maxTilt = signal(12);
  readonly perspective = signal(800);
  readonly scale = signal(1.03);
  readonly glare = signal(false);
}

/** The same directive on a consumer's own element — one harness has to find both. */
@Component({
  imports: [WrTilt],
  template: '<img wrTilt [maxTilt]="20" src="/photo.jpg" alt="A photo" />',
})
class BareHost {}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * Every tilt this component writes comes out of a division by its own measured box, and
 * jsdom measures nothing — so the box is stubbed here, once, and the assertions are
 * about what the directive WROTE rather than about where anything ended up on screen.
 */
describe('WrTiltHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const tilt = (): Promise<WrTiltHarness> => loader.getHarness(WrTiltHarness);

  /** Give the host a 200x100 box at the origin, so a coordinate is a fraction. */
  const measure = (): void => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-tilt-card')!;
    host.getBoundingClientRect = (): DOMRect =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 }) as DOMRect;
  };

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    measure();
  };

  beforeEach(() => mount());

  afterEach(() => fixture.destroy());

  it('sets a card up for 3-D before anything has moved', async () => {
    const harness = await tilt();

    expect(await harness.isPreserve3d()).toBe(true);
    expect([await harness.isFlat(), await harness.getTilt()]).toEqual([true, null]);
  });

  it('tilts away from the pointer, and reports the transform it wrote', async () => {
    const harness = await tilt();

    // Right of centre and above it: the card leans right and tips its top back.
    await harness.movePointerTo(150, 25);

    expect(await harness.isFlat()).toBe(false);
    expect(await harness.getTilt()).toEqual({ rotateX: 3, rotateY: 3 });
    expect([await harness.getPerspective(), await harness.getScale()]).toEqual([800, 1.03]);
  });

  it('reaches the corners of its own range', async () => {
    const harness = await tilt();

    await harness.movePointerTo(200, 100);
    expect(await harness.getTilt()).toEqual({ rotateX: -6, rotateY: 6 });

    await harness.movePointerTo(0, 0);
    expect(await harness.getTilt()).toEqual({ rotateX: 6, rotateY: -6 });
  });

  it('carries the perspective and scale it was given', async () => {
    fixture.componentInstance.perspective.set(1200);
    fixture.componentInstance.scale.set(1.1);
    await fixture.whenStable();
    measure();

    const harness = await tilt();
    await harness.movePointerTo(150, 25);

    expect([await harness.getPerspective(), await harness.getScale()]).toEqual([1200, 1.1]);
  });

  it('settles flat when the pointer leaves, rather than tilting back to zero', async () => {
    const harness = await tilt();
    await harness.movePointerTo(150, 25);

    await harness.leave();

    // Cleared, not written as an identity transform — the empty string IS the state.
    expect([await harness.getTransform(), await harness.isFlat()]).toEqual(['', true]);
  });

  it('stays flat for someone who asked for less motion', async () => {
    mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await tilt();
    await harness.movePointerTo(150, 25);

    expect([await harness.isFlat(), await harness.getTilt()]).toEqual([true, null]);
  });

  it('installs the glare only when asked, and keeps it out of the tree', async () => {
    const harness = await tilt();
    expect([await harness.hasGlare(), await harness.isGlareDecorative()]).toEqual([false, false]);

    fixture.componentInstance.glare.set(true);
    await fixture.whenStable();

    expect([await harness.hasGlare(), await harness.isGlareDecorative()]).toEqual([true, true]);
  });

  it('points the glare at the pointer, and forgets it once the glare is gone', async () => {
    fixture.componentInstance.glare.set(true);
    await fixture.whenStable();
    measure();

    const harness = await tilt();
    expect(await harness.getGlarePosition()).toBeNull();

    await harness.movePointerTo(50, 25);
    expect(await harness.getGlarePosition()).toEqual({ x: '25%', y: '25%' });

    fixture.componentInstance.glare.set(false);
    await fixture.whenStable();

    expect([await harness.hasGlare(), await harness.getGlarePosition()]).toEqual([false, null]);
  });

  it('reads the projected content', async () => {
    expect(await (await tilt()).getContentText()).toBe('Card');
  });

  it('matches on the glare and on being at rest', async () => {
    expect(await loader.getHarnessOrNull(WrTiltHarness.with({ flat: true }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrTiltHarness.with({ glare: true }))).toBeNull();

    fixture.componentInstance.glare.set(true);
    await fixture.whenStable();

    expect(await loader.getHarnessOrNull(WrTiltHarness.with({ glare: true }))).not.toBeNull();
  });

  it('finds the bare directive on a consumer element too', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const bare = TestBed.createComponent(BareHost);
    bare.detectChanges();

    const harness = await TestbedHarnessEnvironment.loader(bare).getHarness(WrTiltHarness);

    expect([await harness.isPreserve3d(), await harness.isFlat()]).toEqual([true, true]);
    expect(await harness.hasGlare()).toBe(false);

    bare.destroy();
  });
});
