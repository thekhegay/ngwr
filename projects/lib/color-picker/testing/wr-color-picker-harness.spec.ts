import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrColorPicker, WrColorPickerTrigger, type WrColorFormat } from 'ngwr/color-picker';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrColorPickerHarness } from './wr-color-picker-harness';
import { WrColorPickerTriggerHarness } from './wr-color-picker-trigger-harness';

@Component({
  imports: [WrColorPicker],
  template: `
    <wr-color-picker
      [(value)]="value"
      [alpha]="alpha()"
      [format]="format()"
      [swatches]="swatches()"
      [disabled]="disabled()"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly value = signal('#ff8800');
  readonly alpha = signal(true);
  readonly format = signal<WrColorFormat>('hex');
  readonly swatches = signal<readonly string[]>(['#00ff00', '#0000ff40']);
  readonly disabled = signal(false);
  touched = 0;
}

/** Two triggers, so a panel query that is not scoped answers for the wrong one. */
@Component({
  imports: [WrColorPickerTrigger],
  template: `
    <button type="button" wrColorPickerTrigger [(value)]="brand">Brand</button>
    <button type="button" wrColorPickerTrigger [(value)]="accent">Accent</button>
    <button type="button" wrColorPickerTrigger value="#123456" [disabled]="true">Locked</button>
  `,
})
class TriggerHost {
  readonly brand = signal('#ff0000');
  readonly accent = signal('#00ff00');
}

/**
 * Used as a consumer would: through the loader, with nothing reached into past the
 * public classes the harness documents.
 *
 * Nothing here drags. The SV canvas and the two sliders are pointer surfaces that
 * divide by a measured box, and jsdom has no layout — so the numeric fields, which
 * are also the component's only keyboard path, are the whole write API, and the
 * thumbs are read for evidence that the surfaces followed.
 */
describe('WrColorPickerHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const picker = (): Promise<WrColorPickerHarness> => loader.getHarness(WrColorPickerHarness);

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('opens on the HEX tab and reads the canonical eight-digit string', async () => {
    const harness = await picker();

    expect(await harness.getTab()).toBe('hex');
    expect(await harness.getHex()).toBe('#ff8800ff');
  });

  it('drops the alpha digits when the picker has no alpha', async () => {
    fixture.componentInstance.alpha.set(false);
    await fixture.whenStable();

    const harness = await picker();
    expect([await harness.hasAlpha(), await harness.getHex()]).toEqual([false, '#ff8800']);
  });

  it('switches tabs through the segmented control it hands back', async () => {
    const harness = await picker();
    const tabs = await harness.getTabs();

    expect(await tabs.getOptionLabels()).toEqual(['HEX', 'RGB', 'HSL']);

    await harness.setTab('rgb');
    expect([await harness.getTab(), await tabs.getSelectedLabel()]).toEqual(['rgb', 'RGB']);

    // Already there — left alone rather than clicked again.
    await harness.setTab('rgb');
    expect(await harness.getTab()).toBe('rgb');
  });

  it('refuses to read fields the active tab does not render', async () => {
    const harness = await picker();

    await expect(harness.getRgb()).rejects.toThrow(/HEX tab/);

    await harness.setTab('rgb');
    await expect(harness.getHex()).rejects.toThrow(/RGB tab/);
  });

  it('reads the RGB channels, and writes one without disturbing the others', async () => {
    const harness = await picker();
    await harness.setTab('rgb');

    expect(await harness.getRgb()).toEqual({ r: 255, g: 136, b: 0 });

    await harness.setRgbChannel('g', 200);

    expect(await harness.getRgb()).toEqual({ r: 255, g: 200, b: 0 });
    expect(fixture.componentInstance.value()).toBe('#ffc800ff');
  });

  it('reads and writes the HSL channels', async () => {
    const harness = await picker();
    await harness.setTab('hsl');

    expect(await harness.getHsl()).toEqual({ h: 32, s: 100, l: 50 });

    await harness.setHslChannel('l', 25);
    expect((await harness.getHsl()).l).toBe(25);
  });

  it('reads alpha as a percent on the numeric tabs, and refuses on HEX', async () => {
    const harness = await picker();

    await expect(harness.getAlphaPercent()).rejects.toThrow(/HEX tab has no alpha field/);

    await harness.setTab('rgb');
    expect(await harness.getAlphaPercent()).toBe(100);

    await harness.setAlphaPercent(50);
    expect(await harness.getAlphaPercent()).toBe(50);

    await harness.setTab('hex');
    expect(await harness.getHex()).toBe('#ff880080');
  });

  it('answers null for alpha on a picker built without it', async () => {
    fixture.componentInstance.alpha.set(false);
    await fixture.whenStable();

    const harness = await picker();
    await harness.setTab('rgb');

    expect(await harness.getAlphaPercent()).toBeNull();
    await expect(harness.setAlphaPercent(50)).rejects.toThrow(/no "A%" field/);
  });

  it('types into the HEX field, committing as soon as a spelling parses', async () => {
    const harness = await picker();

    await harness.setHex('#3969e2');

    expect(await harness.getHex()).toBe('#3969e2');
    expect(fixture.componentInstance.value()).toBe('#3969e2ff');
  });

  it('leaves the colour alone for text that never parses, and snaps back on blur', async () => {
    const harness = await picker();

    await harness.setHex('nonsense');

    // The field keeps what was typed; the committed colour is untouched.
    expect(await harness.getHex()).toBe('nonsense');
    expect(fixture.componentInstance.value()).toBe('#ff8800');

    await harness.blurHex();

    expect(await harness.getHex()).toBe('#ff8800ff');
    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('moves the thumbs with the colour, from percentages rather than a measured box', async () => {
    const harness = await picker();

    expect(await harness.getThumbs()).toEqual({ sv: { x: 100, y: 0 }, hue: 8.888888888888889, alpha: 100 });

    await harness.setTab('rgb');
    await harness.setAlphaPercent(25);

    expect((await harness.getThumbs()).alpha).toBe(25);
  });

  it('reads the offset the component declared, not one a layout resolved', async () => {
    // `getCssValue()` is `getComputedStyle()`, and `left` / `top` on a positioned element
    // resolve to the USED value — so the declared `100%` echoes back here and arrives as
    // pixels under a browser runner, with nothing to say which one you got.
    const harness = await picker();
    const thumb = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.wr-color-picker__sv .wr-color-picker__thumb'
    )!;
    thumb.removeAttribute('style');

    // The stylesheet parks every thumb at `top: 0; left: 0`, so once it is loaded a
    // computed read answers 0 for a thumb whose binding is gone — a plausible origin. The
    // attribute read has nothing to report and says so.
    await expect(harness.getThumbs()).rejects.toThrow(/SV thumb carries no inline left percentage/);
  });

  it('has no alpha thumb when the picker has no alpha', async () => {
    fixture.componentInstance.alpha.set(false);
    await fixture.whenStable();

    expect((await (await picker()).getThumbs()).alpha).toBeNull();
  });

  it('lists the presets by the strings they were given, and picks one', async () => {
    const harness = await picker();

    expect(await harness.getSwatches()).toEqual(['#00ff00', '#0000ff40']);

    await harness.pickSwatch('#00ff00');

    // A six-digit preset says nothing about alpha, so the current alpha survives it.
    expect(await harness.getHex()).toBe('#00ff00ff');
  });

  it('names what it does offer when a preset is not there', async () => {
    const harness = await picker();
    await expect(harness.pickSwatch('#abcdef')).rejects.toThrow(/#00ff00, #0000ff40/);
  });

  it('reports a disabled picker from the state the surfaces are gated on', async () => {
    const harness = await picker();
    expect(await harness.isDisabled()).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await harness.isDisabled()).toBe(true);
  });

  it('matches on the colour, the tab and the disabled state', async () => {
    expect(await loader.getHarnessOrNull(WrColorPickerHarness.with({ color: '#ff8800ff' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrColorPickerHarness.with({ tab: 'hex' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrColorPickerHarness.with({ tab: 'rgb' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrColorPickerHarness.with({ disabled: true }))).toBeNull();
  });
});

/**
 * The overlay flavour. The trigger is an element in the fixture and the picker is a
 * portal in the NGWR overlay container, so the harness has to cross between them —
 * `provideWrOverlay()` keeps this file's container out of the next one's.
 */
describe('WrColorPickerTriggerHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TriggerHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const trigger = (text: string): Promise<WrColorPickerTriggerHarness> =>
    loader.getHarness(WrColorPickerTriggerHarness.with({ text }));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TriggerHost);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('says what it opens, and whether it is open', async () => {
    const brand = await trigger('Brand');

    expect([await brand.getHasPopup(), await brand.isOpen()]).toEqual(['dialog', false]);
    expect(await brand.getPicker()).toBeNull();

    await brand.open();

    expect(await brand.isOpen()).toBe(true);
    expect(await brand.getPicker()).not.toBeNull();
  });

  it('hands back a picker bound to its own value', async () => {
    const picker = await (await trigger('Brand')).open();

    expect(await picker.getHex()).toBe('#ff0000ff');

    await picker.setHex('#3969e2');
    expect(fixture.componentInstance.brand()).toBe('#3969e2ff');
    expect(fixture.componentInstance.accent()).toBe('#00ff00');
  });

  it('gives each trigger its own panel when two are open at once', async () => {
    const brand = await (await trigger('Brand')).open();
    const accent = await (await trigger('Accent')).open();

    expect([await brand.getHex(), await accent.getHex()]).toEqual(['#ff0000ff', '#00ff00ff']);
  });

  it('closes on a second click and on Escape', async () => {
    const brand = await trigger('Brand');

    await brand.open();
    await brand.close();
    expect([await brand.isOpen(), await brand.getPicker()]).toEqual([false, null]);

    await brand.open();
    await brand.sendEscape();
    await fixture.whenStable();

    expect(await brand.isOpen()).toBe(false);
  });

  it('reports a disabled trigger and refuses to open it', async () => {
    const locked = await trigger('Locked');

    expect(await locked.isDisabled()).toBe(true);
    await expect(locked.open()).rejects.toThrow(/disabled/);
    expect(await locked.isOpen()).toBe(false);
  });
});
