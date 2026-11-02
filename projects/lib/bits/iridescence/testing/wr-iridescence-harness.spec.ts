import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrIridescence } from 'ngwr/bits/iridescence';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrIridescenceHarness } from './wr-iridescence-harness';

@Component({
  imports: [WrIridescence],
  template: `<wr-iridescence [color]="color()" [speed]="0" [followPointer]="false" />`,
})
class Host {
  readonly color = signal<string | null>(null);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Everything this component draws is a fragment shader's output, so the assertions are
 * about what it says out loud instead: the colour it publishes for the CSS stand-in, and
 * whether it has handed over to the canvas. jsdom refuses the WebGL2 context, which makes
 * "not painted" the correct answer in a plain mount. A stub context CAN make it `true`,
 * so both answers are pinned here: a harness that always said `false` would pass the
 * first half on a component whose draw never sets the flag.
 */
describe('WrIridescenceHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const silk = (): Promise<WrIridescenceHarness> => loader.getHarness(WrIridescenceHarness);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  /**
   * The smallest WebGL2 that lets the boot reach a draw, and a box to draw in, since a
   * draw on an empty bitmap paints nothing. Every call is a no-op except the two status
   * reads, and `createProgram` and `createShader`, whose results the boot checks.
   */
  const withContext = (): void => {
    const gl: Record<string, unknown> = {
      createShader: () => ({}),
      createProgram: () => ({}),
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      isContextLost: () => false,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      new Proxy(gl, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(180);
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('puts a surface up and keeps it out of the accessibility tree', async () => {
    const harness = await silk();

    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('tells a canvas that lost its decoration from one that kept it', async () => {
    (fixture.nativeElement as HTMLElement).querySelector('canvas')!.removeAttribute('aria-hidden');

    expect(await (await silk()).isDecorative()).toBe(false);
  });

  it('tells a host with no surface from one with a surface', async () => {
    (fixture.nativeElement as HTMLElement).querySelector('canvas')!.remove();

    expect(await (await silk()).hasCanvas()).toBe(false);
  });

  it('leaves the stand-in up while it has painted nothing', async () => {
    expect(await (await silk()).isPainted()).toBe(false);
  });

  it('reports the handover once a real draw has happened', async () => {
    withContext();
    await mount();

    // A still frame, since nothing can move: `[speed]` is 0 and the pointer is off.
    expect(await (await silk()).isPainted()).toBe(true);
  });

  it('reports the input as authored, and nothing while the theme is in charge', async () => {
    const harness = await silk();
    expect(await harness.getColor()).toBeNull();

    fixture.componentInstance.color.set('var(--wr-color-primary)');
    await fixture.whenStable();
    expect(await harness.getColor()).toBe('var(--wr-color-primary)');

    fixture.componentInstance.color.set('  ');
    await fixture.whenStable();
    expect(await harness.getColor()).toBeNull();
  });

  it('reports a colour built on the hook as it was written', async () => {
    const expression = 'color-mix(in srgb, var(--wr-iridescence-color) 50%, black)';
    fixture.componentInstance.color.set(expression);
    await fixture.whenStable();

    expect(await (await silk()).getColor()).toBe(expression);
  });

  it('reads the host, not the cascade, so a stylesheet default cannot answer for it', async () => {
    // A hook is the author's, on an ancestor or on the host, and not the host publishing a colour.
    (fixture.nativeElement as HTMLElement).style.setProperty('--wr-iridescence-color', 'red');
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('wr-iridescence')!
      .style.setProperty('--wr-iridescence-color', 'red');

    expect(await (await silk()).getColor()).toBeNull();
  });

  it('says exactly the same thing for someone who asked for less motion', async () => {
    // The still frame goes through the same draw, so nothing in the DOM tells the two paths
    // apart, which is why there is no `isReducedMotion()`.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const harness = await silk();
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isPainted()).toBe(false);
    expect(await harness.getColor()).toBeNull();
  });

  it('matches on whether the canvas has taken over, both ways', async () => {
    expect(await loader.getHarnessOrNull(WrIridescenceHarness.with({ painted: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrIridescenceHarness.with({ painted: true }))).toBeNull();

    withContext();
    await mount();

    expect(await loader.getHarnessOrNull(WrIridescenceHarness.with({ painted: true }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrIridescenceHarness.with({ painted: false }))).toBeNull();
  });
});
