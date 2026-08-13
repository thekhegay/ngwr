import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrFuzzyText } from 'ngwr/fuzzy-text';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFuzzyTextHarness } from './wr-fuzzy-text-harness';

@Component({
  imports: [WrFuzzyText],
  template: `<wr-fuzzy-text [text]="text()" [glitchMode]="glitchMode()" [clickEffect]="clickEffect()" />`,
})
class Host {
  readonly text = signal('404');
  readonly glitchMode = signal(false);
  readonly clickEffect = signal(false);
}

@Component({
  imports: [WrFuzzyText],
  template: `
    <wr-fuzzy-text text="404" />
    <wr-fuzzy-text text="Gone" />
  `,
})
class TwoHeadlines {}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * jsdom hands this component no drawing context, so `init()` returns two lines in and
 * every pixel it exists to paint is unreachable — which is fine, because the pixels were
 * never the part at risk. What is asserted here is the half that carries the page when the
 * canvas cannot: a readable copy of the headline, a canvas kept out of the accessibility
 * tree, and the inline block that hides the copy in an entry point that ships no CSS.
 *
 * Each of these booleans has one reachable state, and that is a property of the component
 * rather than a hole in the spec: the span, the canvas and the `aria-hidden` are all
 * unconditional markup. The last test reaches the other side of one of them by taking the
 * canvas away, which is the regression the paired assertion exists to catch.
 */
describe('WrFuzzyTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const headline = (): Promise<WrFuzzyTextHarness> => loader.getHarness(WrFuzzyTextHarness);

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

  it('carries the headline as text and the pixels as decoration', async () => {
    const harness = await headline();

    expect(await harness.getText()).toBe('404');
    expect(await harness.isDecorative()).toBe(true);
    expect(await harness.hasCanvas()).toBe(true);
  });

  it('follows the text it is given', async () => {
    const harness = await headline();

    fixture.componentInstance.text.set('Not found');
    await fixture.whenStable();

    expect(await harness.getText()).toBe('Not found');
  });

  it('hides the readable copy without depending on a stylesheet', async () => {
    expect(await (await headline()).isTextVisuallyHidden()).toBe(true);
  });

  it('keeps the surface in the markup where nothing can paint on it', async () => {
    // Which is exactly this test: `getContext('2d')` returns null in jsdom, so the
    // component bails before it draws anything at all — and the headline still reads.
    const harness = await headline();

    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.getText()).toBe('404');
  });

  it('reads the same with the glitch and click effects switched on', async () => {
    const harness = await headline();

    fixture.componentInstance.glitchMode.set(true);
    fixture.componentInstance.clickEffect.set(true);
    await fixture.whenStable();

    expect(await harness.getText()).toBe('404');
    expect(await harness.isDecorative()).toBe(true);
  });

  it('renders the readable copy on the server too', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);
    const harness = await headline();

    expect(await harness.getText()).toBe('404');
    expect(await harness.hasCanvas()).toBe(true);
    expect(await harness.isDecorative()).toBe(true);
  });

  it('still reads for someone who asked for less motion', async () => {
    // The preference changes which drawing path runs and nothing else — same span, same
    // canvas, same attribute — so this asserts the accessible half is unconditional
    // rather than claiming to observe the preference itself.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    const harness = await headline();

    expect(await harness.getText()).toBe('404');
    expect(await harness.isDecorative()).toBe(true);
    expect(await harness.isTextVisuallyHidden()).toBe(true);
  });

  it('addresses one headline among several', async () => {
    const headlines = TestBed.createComponent(TwoHeadlines);
    headlines.detectChanges();
    await headlines.whenStable();
    const headlinesLoader = TestbedHarnessEnvironment.loader(headlines);

    const gone = await headlinesLoader.getHarness(WrFuzzyTextHarness.with({ text: 'Gone' }));
    expect(await gone.getText()).toBe('Gone');
    expect(await headlinesLoader.getHarnessOrNull(WrFuzzyTextHarness.with({ text: '500' }))).toBeNull();
    expect(await headlinesLoader.getAllHarnesses(WrFuzzyTextHarness.with({ text: /^(404|Gone)$/ }))).toHaveLength(2);

    headlines.destroy();
  });

  it('says which half broke when the canvas is gone entirely', async () => {
    // Simulating the inverse of the regression the pair exists for: a component that
    // stopped rendering the surface would make a boolean `isDecorative()` answer `false`
    // and read as "the canvas is announced", which is the wrong thing to go and fix.
    (fixture.nativeElement as HTMLElement).querySelector('canvas')!.remove();
    const harness = await headline();

    expect(await harness.hasCanvas()).toBe(false);
    await expect(harness.isDecorative()).rejects.toThrow(/no <canvas> in this headline/);
    expect(await harness.getText()).toBe('404');
  });
});
