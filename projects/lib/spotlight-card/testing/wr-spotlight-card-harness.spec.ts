import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrSpotlight, WrSpotlightCard } from 'ngwr/spotlight-card';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSpotlightCardHarness } from './wr-spotlight-card-harness';
import { WrSpotlightHarness } from './wr-spotlight-harness';

@Component({
  imports: [WrSpotlightCard],
  template: `
    <wr-spotlight-card [spotlightColor]="spotlightColor()" [radius]="radius()">
      <span>Hover me</span>
    </wr-spotlight-card>
  `,
})
class CardHost {
  readonly spotlightColor = signal<string | null>(null);
  readonly radius = signal<number | string>(80);
}

@Component({
  imports: [WrSpotlightCard],
  template: `
    <wr-spotlight-card><span>First</span></wr-spotlight-card>
    <wr-spotlight-card><span>Second</span></wr-spotlight-card>
  `,
})
class TwoCards {}

@Component({
  imports: [WrSpotlight, WrSpotlightCard],
  template: `<wr-spotlight-card wrSpotlight><span>Both</span></wr-spotlight-card>`,
})
class CardWithDirective {}

@Component({
  imports: [WrSpotlight],
  template: `
    @if (present()) {
      <div class="panel" wrSpotlight [resetX]="resetX()" [resetY]="resetY()">Panel</div>
    }
  `,
})
class DirectiveHost {
  readonly present = signal(true);
  readonly resetX = signal('0%');
  readonly resetY = signal('10%');
}

@Component({
  imports: [WrSpotlight],
  template: `
    <div class="first" wrSpotlight>First</div>
    <div class="second" wrSpotlight>Second</div>
  `,
})
class TwoHosts {}

/**
 * The card's whole output is three custom properties, so these assertions are the
 * arithmetic and the SPELLING that feed a gradient nobody here can paint: the `%` the
 * radius must keep, the colour that must stay absent so the theme can decide, and a
 * coordinate measured against the card's own box. The last one needs a stubbed rect —
 * jsdom puts every element at the origin with no size, which turns the component's
 * subtraction into a no-op and would let a spec assert the client coordinate back and
 * call it box-relative.
 */
describe('WrSpotlightCardHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CardHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const card = (): Promise<WrSpotlightCardHarness> => loader.getHarness(WrSpotlightCardHarness);

  /** A box that is neither at the origin nor zero-sized, so the subtraction is visible. */
  const stubBox = (): void => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-spotlight-card')!;
    host.getBoundingClientRect = (): DOMRect => ({ left: 40, top: 20, width: 200, height: 100 }) as DOMRect;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(CardHost);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('publishes the radius as a percentage, and coerces its way back to the default', async () => {
    const harness = await card();
    expect(await harness.getRadiusPercent()).toBe(80);

    fixture.componentInstance.radius.set(40);
    await fixture.whenStable();
    expect(await harness.getRadiusPercent()).toBe(40);

    fixture.componentInstance.radius.set('oops');
    await fixture.whenStable();
    expect(await harness.getRadiusPercent()).toBe(80);
  });

  it('refuses a radius the stylesheet could not use', async () => {
    // `Infinity` survives the numeric coercion and becomes the literal `Infinity%`,
    // which is not a length — the browser drops the whole gradient declaration.
    fixture.componentInstance.radius.set(Number.POSITIVE_INFINITY);
    await fixture.whenStable();

    await expect((await card()).getRadiusPercent()).rejects.toThrow(/reads "Infinity%"/);
  });

  it('leaves the colour to the theme until it is told one', async () => {
    const harness = await card();
    expect(await harness.getSpotlightColor()).toBeNull();

    fixture.componentInstance.spotlightColor.set('rgba(120, 180, 255, 0.25)');
    await fixture.whenStable();
    expect(await harness.getSpotlightColor()).toBe('rgba(120, 180, 255, 0.25)');
  });

  it('reports no pointer at all until something points at it', async () => {
    expect(await (await card()).getSpotlightPosition()).toBeNull();
  });

  it('follows the pointer, in pixels from its own top-left corner', async () => {
    stubBox();
    const harness = await card();

    await harness.movePointerTo(140, 70);
    expect(await harness.getSpotlightPosition()).toEqual({ x: 100, y: 50 });

    await harness.movePointerTo(40, 20);
    expect(await harness.getSpotlightPosition()).toEqual({ x: 0, y: 0 });
  });

  it('projects its content with nothing wrapped around it', async () => {
    expect(await (await card()).getContentText()).toBe('Hover me');
  });

  it('addresses one card among several', async () => {
    const cards = TestBed.createComponent(TwoCards);
    cards.detectChanges();
    await cards.whenStable();
    const cardsLoader = TestbedHarnessEnvironment.loader(cards);

    const second = await cardsLoader.getHarness(WrSpotlightCardHarness.with({ text: 'Second' }));
    expect(await second.getContentText()).toBe('Second');
    expect(await cardsLoader.getHarnessOrNull(WrSpotlightCardHarness.with({ text: 'Third' }))).toBeNull();
    expect(await cardsLoader.getAllHarnesses(WrSpotlightCardHarness.with({ text: /^(First|Second)$/ }))).toHaveLength(
      2
    );

    cards.destroy();
  });

  it("refuses a coordinate written in the directive's units", async () => {
    // `[wrSpotlight]` on a `<wr-spotlight-card>` is what the docs page shows side by
    // side, and the two exports share these variables while disagreeing about the unit.
    const both = TestBed.createComponent(CardWithDirective);
    both.detectChanges();
    await both.whenStable();
    const bothLoader = TestbedHarnessEnvironment.loader(both);

    const host = (both.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-spotlight-card')!;
    host.getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;

    await (await bothLoader.getHarness(WrSpotlightHarness)).movePointerTo(100, 50);
    const cardHarness = await bothLoader.getHarness(WrSpotlightCardHarness);

    await expect(cardHarness.getSpotlightPosition()).rejects.toThrow(/not the pixel length/);

    both.destroy();
  });
});

/**
 * The directive writes the same two variables as the card and means something else by
 * them, so every assertion here is on the raw string. Three behaviours nothing else in
 * the repo covers: the percentage maths, the reset-on-leave path, and the removal on
 * destroy — plus the constructor's own value, which is not the one the template asked
 * for.
 */
describe('WrSpotlightHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DirectiveHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const spotlight = (): Promise<WrSpotlightHarness> => loader.getHarness(WrSpotlightHarness);

  /** Offset AND sized, so the subtraction and the division are both assertable. */
  const stubBox = (): void => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[wrSpotlight]')!;
    host.getBoundingClientRect = (): DOMRect => ({ left: 20, top: 10, width: 200, height: 100 }) as DOMRect;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(DirectiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('seeds the reset coordinates before the bound ones exist', async () => {
    // The template asks for `0%` / `10%`, and the constructor writes `50%` / `50%`:
    // it runs before signal inputs are bound, so it reads the input DEFAULTS. Reading
    // the written coordinate rather than echoing the input is what makes that visible.
    const harness = await spotlight();

    expect(await harness.getSpotlightPosition()).toEqual({ x: '50%', y: '50%' });
    expect(await harness.hasTrackedPointer()).toBe(true);
  });

  it('refuses to point at a host that has no box', async () => {
    await expect((await spotlight()).movePointerTo(70, 35)).rejects.toThrow(/measures 0×0/);
  });

  it('writes the pointer position as a share of its own box', async () => {
    stubBox();
    const harness = await spotlight();

    await harness.movePointerTo(70, 35);
    expect(await harness.getSpotlightPosition()).toEqual({ x: '25%', y: '25%' });

    await harness.movePointerTo(220, 110);
    expect(await harness.getSpotlightPosition()).toEqual({ x: '100%', y: '100%' });
  });

  it('restores the bound reset when the pointer leaves', async () => {
    stubBox();
    const harness = await spotlight();

    await harness.movePointerTo(70, 35);
    expect(await harness.getSpotlightPosition()).toEqual({ x: '25%', y: '25%' });

    await harness.leave();
    expect(await harness.getSpotlightPosition()).toEqual({ x: '0%', y: '10%' });
  });

  it('takes its variables back off the element when it goes away', async () => {
    const harness = await spotlight();
    expect(await harness.hasTrackedPointer()).toBe(true);

    fixture.componentInstance.present.set(false);
    await fixture.whenStable();

    expect(await harness.hasTrackedPointer()).toBe(false);
    await expect(harness.getSpotlightPosition()).rejects.toThrow(/torn-down directive/);
  });

  it('addresses one decorated element among several', async () => {
    const hosts = TestBed.createComponent(TwoHosts);
    hosts.detectChanges();
    await hosts.whenStable();
    const hostsLoader = TestbedHarnessEnvironment.loader(hosts);

    expect(await hostsLoader.getAllHarnesses(WrSpotlightHarness)).toHaveLength(2);

    const byClass = await hostsLoader.getHarness(WrSpotlightHarness.with({ hostClass: 'second' }));
    expect(await byClass.hasTrackedPointer()).toBe(true);
    expect(await hostsLoader.getHarnessOrNull(WrSpotlightHarness.with({ hostClass: 'third' }))).toBeNull();

    const byText = await hostsLoader.getAllHarnesses(WrSpotlightHarness.with({ text: /First/ }));
    expect(byText).toHaveLength(1);

    hosts.destroy();
  });
});
