import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrGlitchText } from 'ngwr/glitch-text';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGlitchTextHarness } from './wr-glitch-text-harness';

@Component({
  imports: [WrGlitchText],
  template: `
    <wr-glitch-text
      [text]="text()"
      [speed]="speed()"
      [enableShadows]="enableShadows()"
      [enableOnHover]="enableOnHover()"
      [background]="background()"
    />
  `,
})
class Host {
  readonly text = signal('GLITCH');
  readonly speed = signal(1);
  readonly enableShadows = signal(true);
  readonly enableOnHover = signal(true);
  readonly background = signal('');
}

/**
 * Nothing here asserts the glitch. The tear is a keyframed clip-path on a pseudo-element
 * behind a `:hover` selector, and a unit test loads no stylesheet — so what the harness
 * reads, and all it reads, is the handful of values the component writes itself: the
 * `data-text` mirror the clones draw from, one modifier class, and four custom
 * properties.
 */
describe('WrGlitchTextHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const glitch = (): Promise<WrGlitchTextHarness> => loader.getHarness(WrGlitchTextHarness);
  const hostElement = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-glitch-text')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('renders the text and mirrors it into the attribute the clones read', async () => {
    const harness = await glitch();

    expect([await harness.getText(), await harness.getCloneText()]).toEqual(['GLITCH', 'GLITCH']);
    expect(await harness.isCloneTextInSync()).toBe(true);

    fixture.componentInstance.text.set('OTHER');
    await fixture.whenStable();

    expect([await harness.getText(), await harness.getCloneText()]).toEqual(['OTHER', 'OTHER']);
    expect(await harness.isCloneTextInSync()).toBe(true);
  });

  it('counts an empty string as a mirror of nothing rather than a missing binding', async () => {
    fixture.componentInstance.text.set('');
    await fixture.whenStable();

    const harness = await glitch();
    expect(await harness.getCloneText()).toBe('');
    expect(await harness.isCloneTextInSync()).toBe(true);
  });

  it('reports the mirror as broken once the attribute drifts from the text', async () => {
    const harness = await glitch();
    // The silent failure this component has: visible text intact, clones drawing nothing.
    hostElement().removeAttribute('data-text');

    expect(await harness.getText()).toBe('GLITCH');
    expect(await harness.getCloneText()).toBeNull();
    expect(await harness.isCloneTextInSync()).toBe(false);
  });

  it('idles until hover by default, and stops doing so when told', async () => {
    const harness = await glitch();
    expect(await harness.isHoverOnly()).toBe(true);

    fixture.componentInstance.enableOnHover.set(false);
    await fixture.whenStable();

    expect(await harness.isHoverOnly()).toBe(false);
  });

  it('scales both clones by speed and keeps them out of phase', async () => {
    const harness = await glitch();
    expect(await harness.getDurations()).toEqual({ before: 2, after: 3 });

    fixture.componentInstance.speed.set(0.3);
    await fixture.whenStable();

    // Raw float arithmetic — the after-duration is written as `0.8999999999999999s`.
    const { before, after } = await harness.getDurations();
    expect(before).toBeCloseTo(0.6);
    expect(after).toBeCloseTo(0.9);
    expect(before).not.toBe(after);
  });

  it('splits the colour in opposite directions, with two different intents', async () => {
    const harness = await glitch();
    expect(await harness.hasColourSplit()).toBe(true);

    const { before, after } = await harness.getColourSplit();
    expect(before).toBe('5px 0 var(--wr-color-info)');
    expect(after).toBe('-5px 0 var(--wr-color-danger)');
  });

  it('writes `none` rather than dropping the shadows when the split is off', async () => {
    fixture.componentInstance.enableShadows.set(false);
    await fixture.whenStable();

    const harness = await glitch();
    expect(await harness.hasColourSplit()).toBe(false);
    expect(await harness.getColourSplit()).toEqual({ before: 'none', after: 'none' });
  });

  it('leaves the slice background absent until one is given', async () => {
    const harness = await glitch();
    expect(await harness.getSliceBackground()).toBeNull();

    fixture.componentInstance.background.set('#101010');
    await fixture.whenStable();

    expect(await harness.getSliceBackground()).toBe('#101010');
  });

  it('refuses to invent a duration the component did not write', async () => {
    const harness = await glitch();
    hostElement().style.setProperty('--wr-glitch-text-before-duration', 'wobbly');

    await expect(harness.getDurations()).rejects.toThrow(/--wr-glitch-text-before-duration/);
    await expect(harness.getDurations()).rejects.toThrow(/"wobbly"/);
  });

  it('matches on the rendered text and on the hover gate', async () => {
    expect(await loader.getHarnessOrNull(WrGlitchTextHarness.with({ text: 'GLITCH' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGlitchTextHarness.with({ text: /^GLI/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGlitchTextHarness.with({ text: 'OTHER' }))).toBeNull();

    expect(await loader.getHarnessOrNull(WrGlitchTextHarness.with({ hoverOnly: true }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGlitchTextHarness.with({ hoverOnly: false }))).toBeNull();
  });
});
