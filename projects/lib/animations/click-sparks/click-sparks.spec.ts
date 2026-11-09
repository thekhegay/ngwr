import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CLICK_SPARKS_COUNT, CLICK_SPARKS_FLY, CLICK_SPARKS_MAX, CLICK_SPARKS_MS, WrClickSparks } from './click-sparks';

@Component({
  imports: [WrClickSparks],
  template: `<a href="#start" wrClickSparks (click)="clicks.set(clicks() + 1)">Get started</a>`,
})
class Host {
  readonly clicks = signal(0);
}

@Component({
  imports: [WrClickSparks],
  template: `<button type="button" wrClickSparks="5" style="--wr-click-sparks-color: rgb(1, 2, 3)">Go</button>`,
})
class TunedHost {}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

/** A pointer's click: `detail` is 1, as a mouse or a finger gives, where a keyboard gives 0. */
const click = (el: HTMLElement, init: MouseEventInit = {}): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    detail: 1,
    clientX: 40,
    clientY: 30,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
};

/** `animationend` as the browser fires it for `name`, on `el`. jsdom has no `AnimationEvent`. */
const end = (el: Element, name: string): void => {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: name });
  el.dispatchEvent(event);
};

/** The live bursts, oldest first. */
const layers = (): HTMLElement[] => Array.from(document.body.querySelectorAll<HTMLElement>('.wr-click-sparks'));

const point = (layer: HTMLElement): [string, string] => [
  layer.style.getPropertyValue('--wr-click-sparks-x'),
  layer.style.getPropertyValue('--wr-click-sparks-y'),
];

describe('WrClickSparks', () => {
  const render = async <T>(
    host: new () => T,
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    // After the render settles: the fallback timers are the directive's own, the render's are not.
    vi.useFakeTimers();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('[wrClickSparks]')!;

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    for (const layer of layers()) layer.remove();
  });

  it('adds nothing to the host or the body until a click', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe('Get started');
    expect(layers()).toHaveLength(0);
  });

  it('bursts a ring of strokes in the body at the click point, hidden from assistive tech', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    click(el, { clientX: 120, clientY: 80 });

    const [layer] = layers();
    expect(layers()).toHaveLength(1);
    expect(layer.parentElement).toBe(document.body);
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(point(layer)).toEqual(['120px', '80px']);
    expect(layer.style.getPropertyValue('--wr-click-sparks-duration')).toBe(`${CLICK_SPARKS_MS}ms`);

    const sparks = Array.from(layer.querySelectorAll<HTMLElement>('.wr-click-sparks__spark'));
    expect(sparks).toHaveLength(CLICK_SPARKS_COUNT);
    expect(layer.children).toHaveLength(CLICK_SPARKS_COUNT);
    const angles = sparks.map(spark => parseFloat(spark.style.getPropertyValue('--wr-click-sparks-angle')));
    for (let i = 1; i < angles.length; i++) expect(angles[i] - angles[i - 1]).toBeCloseTo(360 / CLICK_SPARKS_COUNT);

    expect(el.children).toHaveLength(0);
  });

  it('turns the ring between bursts so two in a row never overlap', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    click(el);
    click(el);

    const [first, second] = layers().map(layer =>
      parseFloat(/angle:\s*([\d.]+)deg/.exec(layer.firstElementChild!.getAttribute('style')!)![1])
    );
    expect(second).not.toBeCloseTo(first);
    expect(Math.abs(second - first) % (360 / CLICK_SPARKS_COUNT)).not.toBeCloseTo(0);
  });

  it('removes the burst when its strokes end, and ignores another animation', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    const [layer] = layers();

    end(layer.firstElementChild!, 'something-else');
    expect(layers()).toHaveLength(1);

    end(layer.firstElementChild!, CLICK_SPARKS_FLY);
    expect(layers()).toHaveLength(0);

    vi.advanceTimersByTime(CLICK_SPARKS_MS * 2);
    expect(layers()).toHaveLength(0);
  });

  it('removes the burst a little after its length when no animation end comes', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);

    vi.advanceTimersByTime(CLICK_SPARKS_MS);
    expect(layers()).toHaveLength(1);

    vi.advanceTimersByTime(200);
    expect(layers()).toHaveLength(0);
  });

  it('keeps at most the cap of bursts alive and drops the oldest', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    for (let i = 0; i <= CLICK_SPARKS_MAX; i++) click(el, { clientX: i, clientY: 0 });

    const live = layers();
    expect(live).toHaveLength(CLICK_SPARKS_MAX);
    expect(live.map(layer => point(layer)[0])).toEqual(
      Array.from({ length: CLICK_SPARKS_MAX }, (_, i) => `${i + 1}px`)
    );

    vi.advanceTimersByTime(CLICK_SPARKS_MS + 200);
    expect(layers()).toHaveLength(0);
  });

  it('bursts from the centre of the host on a keyboard activation', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 80,
      height: 30,
    } as DOMRect);

    click(el, { detail: 0, clientX: 0, clientY: 0 });

    expect(point(layers()[0])).toEqual(['140px', '65px']);
  });

  it('never touches the click: handlers run and the default is not prevented', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    const event = click(el);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.clicks()).toBe(1);
    expect(layers()).toHaveLength(1);
  });

  it('takes the stroke count from its value and the colour from the hook on the host', async () => {
    const fixture = await render(TunedHost);
    const el = target(fixture);

    click(el);

    const [layer] = layers();
    expect(layer.children).toHaveLength(5);
    expect(layer.style.color).toBe('rgb(1, 2, 3)');
  });

  it('paints in the host colour and font size when no hook is set', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    el.style.color = 'rgb(9, 8, 7)';
    el.style.fontSize = '20px';

    click(el);

    const [layer] = layers();
    expect(layer.style.color).toBe('rgb(9, 8, 7)');
    expect(layer.style.fontSize).toBe('20px');
  });

  it('does nothing under reduced motion, even when it flips on later', async () => {
    const page = stub(true);
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);

    click(el);
    expect(layers()).toHaveLength(0);

    page.prefersReducedMotion.set(false);
    click(el);
    expect(layers()).toHaveLength(1);

    page.prefersReducedMotion.set(true);
    click(el);
    expect(layers()).toHaveLength(1);
  });

  it('does nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render(Host);
    const el = target(fixture);

    click(el);

    expect(layers()).toHaveLength(0);
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    click(el);

    expect(layers()).toHaveLength(0);
  });

  it('takes live bursts and its listener out on destroy', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    click(el);
    expect(layers()).toHaveLength(2);

    fixture.destroy();
    expect(layers()).toHaveLength(0);

    click(el);
    vi.advanceTimersByTime(CLICK_SPARKS_MS * 2);
    expect(layers()).toHaveLength(0);
  });
});
