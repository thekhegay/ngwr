import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { WrSplashCursor } from 'ngwr/splash-cursor';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSplashCursorHarness } from './wr-splash-cursor-harness';

@Component({
  imports: [WrSplashCursor],
  template: `<wr-splash-cursor [fullscreen]="fullscreen()" />`,
})
class Host {
  readonly fullscreen = signal(true);
}

@Component({
  imports: [WrSplashCursor],
  template: `
    <wr-splash-cursor />
    <wr-splash-cursor [fullscreen]="false" />
  `,
})
class TwoCursors {}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * The fluid itself is WebGL and is never constructed in a test, so what is left to
 * assert is the layout mode — and it is worth the spec precisely because of how it is
 * written: there is no `--fullscreen` class, only a `--contained` one bound to
 * `!fullscreen()`. An inverted binding would still produce a full-viewport overlay on
 * every page that uses the default, and nothing would notice.
 */
describe('WrSplashCursorHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const splash = (): Promise<WrSplashCursorHarness> => loader.getHarness(WrSplashCursorHarness);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(async () => mount());

  afterEach(() => fixture.destroy());

  it('overlays the whole viewport by default, and boxes itself when told to', async () => {
    const harness = await splash();
    expect(await harness.isFullscreen()).toBe(true);

    fixture.componentInstance.fullscreen.set(false);
    await fixture.whenStable();

    expect(await harness.isFullscreen()).toBe(false);
  });

  it('puts a surface up and keeps it out of the accessibility tree', async () => {
    const harness = await splash();

    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('still renders the surface for someone who asked for less motion', async () => {
    // No simulation is built at all on this path, and the DOM does not record that —
    // which is why the harness offers nothing that claims to read it.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await splash();
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
    expect(await harness.isFullscreen()).toBe(true);
  });

  it('still renders the surface on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(await (await splash()).hasCanvas()).toBe(true);
  });

  it('tells two of them apart by layout mode', async () => {
    const cursors = TestBed.createComponent(TwoCursors);
    cursors.detectChanges();
    await cursors.whenStable();
    const cursorsLoader = TestbedHarnessEnvironment.loader(cursors);

    expect(await cursorsLoader.getAllHarnesses(WrSplashCursorHarness.with({ fullscreen: true }))).toHaveLength(1);
    expect(await cursorsLoader.getAllHarnesses(WrSplashCursorHarness.with({ fullscreen: false }))).toHaveLength(1);

    cursors.destroy();
  });
});
