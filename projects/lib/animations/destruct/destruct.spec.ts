import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DESTRUCT_SHIFT, DESTRUCT_STEP, WrDestruct } from './destruct';

@Component({
  imports: [WrDestruct],
  template: `<a href="#"
    ><i class="mark"></i><span wrDestruct>{{ word() }}</span></a
  >`,
})
class Host {
  readonly word = signal('ngwr');
}

@Component({
  imports: [WrDestruct],
  template: `<p><span wrDestruct>plain</span></p>`,
})
class PlainHost {}

@Component({
  imports: [WrDestruct],
  template: `<span wrDestruct>One</span><span wrDestruct>Two</span>`,
})
class PairHost {}

/** `requestAnimationFrame` by hand: frames run when the spec says, at the time the spec says. */
class Frames {
  private readonly queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  readonly request = vi.fn((cb: FrameRequestCallback): number => {
    this.queue.set(++this.id, cb);
    return this.id;
  });
  readonly cancel = vi.fn((id: number): void => {
    this.queue.delete(id);
  });
  get pending(): number {
    return this.queue.size;
  }
  /** Run every pending frame at `now`. */
  at(now: number): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    callbacks.forEach(cb => cb(now));
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const FRAME = 16;

/** The peak `scale` of the displacement map: twice the shift, on jsdom's 16px fallback font size. */
const PEAK = 2 * DESTRUCT_SHIFT * 16;

describe('WrDestruct', () => {
  let frames: Frames;

  const render = async <T>(
    host: new () => T,
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.wr-destruct')!;

  const svgs = (fixture: { nativeElement: HTMLElement }): SVGSVGElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll<SVGSVGElement>('svg.wr-destruct__filter'));

  const filter = (fixture: { nativeElement: HTMLElement }): SVGElement => svgs(fixture)[0].querySelector('filter')!;

  /** The displacement's `scale`, as written; `null` with no filter mounted. */
  const scale = (fixture: { nativeElement: HTMLElement }): number | null => {
    const map = fixture.nativeElement.querySelector('feDisplacementMap');
    return map ? Number(map.getAttribute('scale')) : null;
  };

  const turbulence = (fixture: { nativeElement: HTMLElement }): SVGElement =>
    fixture.nativeElement.querySelector('feTurbulence')!;

  const seed = (fixture: { nativeElement: HTMLElement }): string => turbulence(fixture).getAttribute('seed')!;

  /** Whether the host wears the filter right now: the modifier and the url, which must agree. */
  const wearing = (el: HTMLElement): boolean => {
    const on = el.classList.contains('wr-destruct--on');
    const url = el.style.getPropertyValue('--wr-destruct-filter');
    expect(url !== '').toBe(on);
    return on;
  };

  /** Through `count` frames of `FRAME` ms from `from`, collecting the scale after each. Returns the time of the last one. */
  const run = (fixture: { nativeElement: HTMLElement }, count: number, from = 0): { scales: number[]; now: number } => {
    const scales: number[] = [];
    let now = from;
    for (let i = 0; i < count; i++) {
      now += FRAME;
      frames.at(now);
      scales.push(scale(fixture) ?? 0);
    }
    return { scales, now };
  };

  const enter = (source: HTMLElement, fixture: { detectChanges(): void }): void => {
    source.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
  };

  const leave = (source: HTMLElement, fixture: { detectChanges(): void }): void => {
    source.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    frames = new Frames();
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('mounts one hidden noise filter beside the host, off, and leaves the host as it was', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const [svg] = svgs(fixture);

    expect(svgs(fixture)).toHaveLength(1);
    expect(svg.previousElementSibling).toBe(el);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect([svg.getAttribute('width'), svg.getAttribute('height')]).toEqual(['0', '0']);

    const f = filter(fixture);
    expect(f.id).toMatch(/^wr-destruct-/);
    const [turbulence, map] = Array.from(f.children);
    expect(turbulence.tagName).toBe('feTurbulence');
    expect(turbulence.getAttribute('type')).toBe('fractalNoise');
    expect(turbulence.getAttribute('result')).toBe('noise');
    expect(map.tagName).toBe('feDisplacementMap');
    expect(map.getAttribute('in')).toBe('SourceGraphic');
    expect(map.getAttribute('in2')).toBe('noise');
    expect(map.getAttribute('scale')).toBe('0');

    expect(el.className).toBe('wr-destruct');
    expect(el.getAttribute('style')).toBeNull();
    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe('ngwr');
    expect(frames.pending).toBe(0);
  });

  it('gives two hosts two filters with different ids', async () => {
    const fixture = await render(PairHost);
    const ids = svgs(fixture).map(svg => svg.querySelector('filter')!.id);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('eases in on the pointer entering the focusable ancestor, and eases out to no filter at all on leave', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;
    const nodes = Array.from(el.childNodes);

    enter(link, fixture);
    expect(frames.pending).toBe(1);

    // The first frame has no length: the intensity is still zero, nothing is worn.
    frames.at(0);
    expect(wearing(el)).toBe(false);
    expect(frames.pending).toBe(1);

    const up = run(fixture, 60);
    expect(wearing(el)).toBe(true);
    expect(el.style.getPropertyValue('--wr-destruct-filter')).toBe(`url(#${filter(fixture).id})`);
    // The frequency follows the font size: one wave per em across, two down, on the 16px fallback.
    expect(turbulence(fixture).getAttribute('baseFrequency')).toBe('0.0625 0.125');
    // A hair above zero first, then up, never past the peak, and at it by the end.
    expect(up.scales[0]).toBeGreaterThan(0);
    expect(up.scales[0]).toBeLessThan(PEAK * 0.2);
    for (let i = 1; i < up.scales.length; i++) {
      expect(up.scales[i]).toBeGreaterThanOrEqual(up.scales[i - 1]);
      expect(up.scales[i]).toBeLessThanOrEqual(PEAK);
    }
    expect(up.scales[up.scales.length - 1]).toBe(PEAK);

    leave(link, fixture);
    const down = run(fixture, 120, up.now);
    // Down from a hair under the peak, each frame at most the one before, to zero.
    expect(down.scales[0]).toBeLessThan(PEAK);
    expect(down.scales[0]).toBeGreaterThan(PEAK * 0.8);
    for (let i = 1; i < down.scales.length; i++) expect(down.scales[i]).toBeLessThanOrEqual(down.scales[i - 1]);
    expect(down.scales[down.scales.length - 1]).toBe(0);
    expect(wearing(el)).toBe(false);
    expect(el.style.length).toBe(0);
    expect(frames.pending).toBe(0);

    // The host's own nodes are the ones it had.
    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(el.textContent).toBe('ngwr');
  });

  it('calms slower than it rises', async () => {
    const fixture = await render(Host);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    enter(link, fixture);
    frames.at(0);
    const up = run(fixture, 200);
    const rose = up.scales.findIndex(s => s === PEAK);

    leave(link, fixture);
    const down = run(fixture, 200, up.now);
    const calmed = down.scales.findIndex(s => s === 0);

    expect(rose).toBeGreaterThan(0);
    expect(calmed).toBeGreaterThan(rose);
  });

  it('reads focus on the focusable ancestor too', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    link.dispatchEvent(new Event('focusin', { bubbles: true }));
    fixture.detectChanges();
    frames.at(0);
    const up = run(fixture, 60);
    expect(up.scales[up.scales.length - 1]).toBe(PEAK);

    link.dispatchEvent(new Event('focusout', { bubbles: true }));
    fixture.detectChanges();
    run(fixture, 120, up.now);
    expect(wearing(el)).toBe(false);
    expect(frames.pending).toBe(0);
  });

  it('reads the pointer on the host itself when nothing above it is focusable', async () => {
    const fixture = await render(PlainHost);
    const el = target(fixture);

    el.parentElement!.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(frames.pending).toBe(0);

    enter(el, fixture);
    frames.at(0);
    run(fixture, 60);
    expect(wearing(el)).toBe(true);
  });

  it('steps the noise field about fifteen times a second, not every frame', async () => {
    const fixture = await render(Host);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    enter(link, fixture);
    frames.at(0);
    let steps = 0;
    let before = seed(fixture);
    let now = 0;
    // One second of 60 frames.
    for (let i = 0; i < 60; i++) {
      now += FRAME;
      frames.at(now);
      const after = seed(fixture);
      if (after !== before) steps++;
      before = after;
    }

    // A step waits for the first frame after its time is up, so at 60 fps a 66 ms step lands every fifth frame.
    expect(steps).toBeLessThanOrEqual(Math.ceil(1000 / DESTRUCT_STEP));
    expect(steps).toBeGreaterThanOrEqual(Math.floor(1000 / (Math.ceil(DESTRUCT_STEP / FRAME) * FRAME)));
  });

  it('eases a stalled frame a little, never a lot', async () => {
    const fixture = await render(Host);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    enter(link, fixture);
    frames.at(0);
    frames.at(5000);

    // Capped at a tenth of a second of easing: well short of the peak.
    expect(scale(fixture)).toBeGreaterThan(0);
    expect(scale(fixture)).toBeLessThan(PEAK * 0.7);
  });

  it('pauses while the document is hidden, filter and all, and resumes from where it was', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    enter(link, fixture);
    frames.at(0);
    const { scales, now } = run(fixture, 3);
    const paused = scales[2];
    expect(paused).toBeGreaterThan(0);

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(frames.cancel).toHaveBeenCalled();
    expect(frames.pending).toBe(0);
    expect(scale(fixture)).toBe(paused);
    expect(wearing(el)).toBe(true);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(frames.pending).toBe(1);
    // The first frame back has no length.
    frames.at(now + 90_000);
    expect(scale(fixture)).toBe(paused);
    run(fixture, 60, now + 90_000);
    expect(scale(fixture)).toBe(PEAK);
  });

  it('idles at zero, and a hover while hidden plays once the document is shown', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    page.pageVisible.set(false);
    fixture.detectChanges();
    enter(link, fixture);
    expect(frames.pending).toBe(0);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(frames.pending).toBe(1);
  });

  it('clears the filter at once when motion is reduced while it runs', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    enter(link, fixture);
    frames.at(0);
    run(fixture, 10);
    expect(wearing(el)).toBe(true);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(frames.pending).toBe(0);
    expect(wearing(el)).toBe(false);
    expect(scale(fixture)).toBe(0);
  });

  it('mounts nothing under reduced motion', async () => {
    const fixture = await render(Host, [platform(stub(true))]);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    expect(svgs(fixture)).toHaveLength(0);
    enter(link, fixture);
    expect(frames.pending).toBe(0);
    expect(el.className).toBe('wr-destruct');
    expect(el.getAttribute('style')).toBeNull();
  });

  it('mounts nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(svgs(fixture)).toHaveLength(0);
    expect(target(fixture).className).toBe('wr-destruct');
  });

  it('mounts nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render(Host);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    expect(svgs(fixture)).toHaveLength(0);
    enter(link, fixture);
    expect(frames.pending).toBe(0);
  });

  it('keeps a binding live inside the host', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;
    enter(link, fixture);
    frames.at(0);
    run(fixture, 10);

    fixture.componentInstance.word.set('ngtrue');
    fixture.detectChanges();

    expect(el.textContent).toBe('ngtrue');
    expect(wearing(el)).toBe(true);
  });

  it('removes the svg, the filter and its listeners and cancels the loop on destroy', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;
    const [svg] = svgs(fixture);
    enter(link, fixture);
    frames.at(0);
    run(fixture, 10);
    expect(wearing(el)).toBe(true);

    fixture.destroy();

    expect(svg.isConnected).toBe(false);
    expect(frames.cancel).toHaveBeenCalled();
    expect(frames.pending).toBe(0);
    expect(wearing(el)).toBe(false);

    link.dispatchEvent(new Event('pointerenter'));
    expect(frames.pending).toBe(0);
  });
});
