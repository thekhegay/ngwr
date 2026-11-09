import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ORBIT_HOVER_SPEED, ORBIT_LENGTH, ORBIT_SPEED, WrOrbit } from './orbit';

const TEXT = 'Open source · MIT · Signals-first · ';

@Component({
  imports: [WrOrbit],
  template: `<wr-orbit [text]="text()" [label]="label()" [speed]="speed()" [size]="size()">
    <i class="mark">ng</i>
  </wr-orbit>`,
})
class Host {
  readonly text = signal(TEXT);
  readonly label = signal<string | null>(null);
  readonly speed = signal(ORBIT_SPEED);
  readonly size = signal<number | null>(null);
}

@Component({
  imports: [WrOrbit],
  template: `<a href="#"><wr-orbit text="Go · " /></a>`,
})
class FocusableHost {}

@Component({
  imports: [WrOrbit],
  template: `<wr-orbit text="One · " /><wr-orbit text="Two · " />`,
})
class PairHost {}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

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

describe('WrOrbit', () => {
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
    fixture.nativeElement.querySelector<HTMLElement>('.wr-orbit')!;

  const ring = (el: HTMLElement): SVGSVGElement => el.querySelector<SVGSVGElement>('.wr-orbit__ring')!;

  /** The ring's angle, in degrees, as written to its transform; `null` when nothing was written. */
  const angle = (el: HTMLElement): number | null => {
    const match = /rotate\(([-\d.e]+)deg\)/.exec(ring(el).style.transform);
    return match ? Number(match[1]) : null;
  };

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  /** Into view and through `count` frames of `FRAME` ms, from `from`. Returns the time of the last frame. */
  const run = (count: number, from = 0): number => {
    let now = from;
    for (let i = 0; i < count; i++) {
      now += FRAME;
      frames.at(now);
    }
    return now;
  };

  /** The angle advanced by each of `count` frames, in order. */
  const deltas = (el: HTMLElement, count: number, from: number): { steps: number[]; now: number } => {
    const steps: number[] = [];
    let now = from;
    let before = angle(el)!;
    for (let i = 0; i < count; i++) {
      now += FRAME;
      frames.at(now);
      const after = angle(el)!;
      steps.push(((after - before) % 360) + (after < before ? 360 : 0));
      before = after;
    }
    return { steps, now };
  };

  beforeEach(() => {
    frames = new Frames();
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('lays the text on a circle path and stretches it to the full circumference', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const svg = ring(el);
    const path = svg.querySelector('defs > path')!;
    const text = svg.querySelector('text')!;
    const textPath = text.querySelector('textPath')!;

    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(path.id).toMatch(/^wr-orbit-/);
    expect(path.getAttribute('d')).toBe('M 9 50 a 41 41 0 1 1 82 0 a 41 41 0 1 1 -82 0');
    expect(textPath.getAttribute('href')).toBe(`#${path.id}`);

    expect(ORBIT_LENGTH).toBeCloseTo(2 * Math.PI * 41, 1);
    for (const node of [text, textPath]) {
      expect(Number(node.getAttribute('textLength'))).toBe(ORBIT_LENGTH);
      expect(node.getAttribute('lengthAdjust')).toBe('spacing');
    }

    // The author's text as is, trailing blank included: it is the gap at the seam.
    expect(textPath.textContent).toBe(TEXT);
    expect(text.getAttribute('xml:space')).toBe('preserve');
  });

  it('gives two rings two paths', async () => {
    const fixture = await render(PairHost);
    const ids = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('path')).map(path => path.id);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('names the image once for a screen reader, by the text without its trailing separator, or by the label', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const svg = ring(el);

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Open source · MIT · Signals-first');
    expect(svg.querySelector('text')!.getAttribute('aria-hidden')).toBe('true');

    fixture.componentInstance.label.set('ngwr is open source');
    fixture.detectChanges();
    expect(svg.getAttribute('aria-label')).toBe('ngwr is open source');
    expect(svg.querySelector('textPath')!.textContent).toBe(TEXT);
  });

  it('projects the centre content into the slot, outside the image', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const mark = el.querySelector('.mark')!;

    expect(mark.closest('.wr-orbit__centre')).not.toBeNull();
    expect(mark.closest('svg')).toBeNull();
    expect(mark.getAttribute('aria-hidden')).toBeNull();
  });

  it('writes a given size to the hook and leaves the hook to the stylesheet without one', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.style.getPropertyValue('--wr-orbit-input-size')).toBe('');

    fixture.componentInstance.size.set(104);
    fixture.detectChanges();
    expect(el.style.getPropertyValue('--wr-orbit-input-size')).toBe('104px');
  });

  it('turns only while in view, and picks up where it stopped', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
    expect(frames.pending).toBe(0);
    expect(el.classList.contains('wr-orbit--run')).toBe(false);

    view(fixture, true);
    expect(el.classList.contains('wr-orbit--run')).toBe(true);
    expect(frames.pending).toBe(1);

    // The first frame has no length: it paints the angle as it is.
    frames.at(1000);
    expect(angle(el)).toBe(0);
    const now = run(30, 1000);
    const stopped = angle(el)!;
    expect(stopped).toBeGreaterThan(0);

    view(fixture, false);
    expect(frames.cancel).toHaveBeenCalled();
    expect(frames.pending).toBe(0);
    expect(el.classList.contains('wr-orbit--run')).toBe(false);

    // A long absence, then back: the ring is where it was, not where time would have put it.
    view(fixture, true);
    frames.at(now + 60_000);
    expect(angle(el)).toBe(stopped);
  });

  it('turns at the resting speed once the speed has settled', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);
    frames.at(0);
    const now = run(200);

    const { steps } = deltas(el, 3, now);
    for (const step of steps) expect(step).toBeCloseTo((ORBIT_SPEED * FRAME) / 1000, 6);
  });

  it('speeds up smoothly on hover and slows back smoothly on leave, with no jump in angle', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);
    frames.at(0);
    let now = run(200);
    const rest = (ORBIT_SPEED * FRAME) / 1000;
    const fast = (ORBIT_HOVER_SPEED * FRAME) / 1000;

    el.dispatchEvent(new Event('pointerenter'));
    const up = deltas(el, 220, now);
    now = up.now;

    // The first step after the change is a hair over the resting step, not the fast one.
    expect(up.steps[0]).toBeGreaterThan(rest);
    expect(up.steps[0]).toBeLessThan(rest + (fast - rest) * 0.1);
    // Each step is at most a little longer than the one before, until the fast step is reached.
    for (let i = 1; i < up.steps.length; i++) {
      expect(up.steps[i]).toBeGreaterThanOrEqual(up.steps[i - 1] - 1e-9);
      expect(up.steps[i]).toBeLessThanOrEqual(fast + 1e-9);
    }
    expect(up.steps[up.steps.length - 1]).toBeCloseTo(fast, 6);

    el.dispatchEvent(new Event('pointerleave'));
    const down = deltas(el, 220, now);

    expect(down.steps[0]).toBeLessThan(fast);
    expect(down.steps[0]).toBeGreaterThan(fast - (fast - rest) * 0.1);
    for (let i = 1; i < down.steps.length; i++) {
      expect(down.steps[i]).toBeLessThanOrEqual(down.steps[i - 1] + 1e-9);
      expect(down.steps[i]).toBeGreaterThanOrEqual(rest - 1e-9);
    }
    expect(down.steps[down.steps.length - 1]).toBeCloseTo(rest, 6);
  });

  it('reads focus on the closest focusable ancestor', async () => {
    const fixture = await render(FocusableHost);
    const el = target(fixture);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;
    view(fixture, true);
    frames.at(0);
    let now = run(200);
    const rest = (ORBIT_SPEED * FRAME) / 1000;
    const fast = (ORBIT_HOVER_SPEED * FRAME) / 1000;

    link.dispatchEvent(new Event('focusin', { bubbles: true }));
    const up = deltas(el, 250, now);
    now = up.now;
    expect(up.steps[up.steps.length - 1]).toBeCloseTo(fast, 6);

    link.dispatchEvent(new Event('focusout', { bubbles: true }));
    const down = deltas(el, 250, now);
    expect(down.steps[down.steps.length - 1]).toBeCloseTo(rest, 6);
  });

  it('keeps a stalled frame from throwing the ring round', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);
    frames.at(0);
    run(200);
    const before = angle(el)!;

    frames.at(200 * FRAME + 5000);

    // Capped at a tenth of a second of travel.
    expect(angle(el)! - before).toBeCloseTo(ORBIT_SPEED * 0.1, 6);
  });

  it('goes idle at speed zero and wakes for a hover', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    fixture.componentInstance.speed.set(0);
    fixture.detectChanges();
    view(fixture, true);
    frames.at(0);

    expect(frames.pending).toBe(0);
    expect(angle(el)).toBe(0);

    el.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(frames.pending).toBe(1);
    run(5);
    expect(angle(el)).toBeGreaterThan(0);

    el.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    run(400, 5 * FRAME);
    expect(frames.pending).toBe(0);
  });

  it('stops while the document is hidden and resumes from the same angle', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    view(fixture, true);
    frames.at(0);
    run(10);
    const stopped = angle(el)!;

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(frames.pending).toBe(0);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(frames.pending).toBe(1);
    frames.at(10 * FRAME + 90_000);
    expect(angle(el)).toBe(stopped);
  });

  it('stops when motion is reduced while it runs, and sits where it is', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    view(fixture, true);
    frames.at(0);
    run(10);
    const stopped = angle(el)!;

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(frames.pending).toBe(0);
    expect(angle(el)).toBe(stopped);
  });

  it('draws the whole ring and never turns it under reduced motion', async () => {
    const fixture = await render(Host, [platform(stub(true))]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(frames.pending).toBe(0);
    expect(ring(el).querySelector('textPath')!.textContent).toBe(TEXT);
    expect(angle(el)).toBeNull();

    el.dispatchEvent(new Event('pointerenter'));
    expect(frames.pending).toBe(0);
  });

  it('draws the whole ring and never turns it on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(frames.pending).toBe(0);
    expect(ring(el).querySelector('textPath')!.getAttribute('textLength')).toBe(String(ORBIT_LENGTH));
    expect(angle(el)).toBeNull();
  });

  it('draws the whole ring and never turns it without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render(Host);
    const el = target(fixture);

    el.dispatchEvent(new Event('pointerenter'));

    expect(frames.pending).toBe(0);
    expect(ring(el).querySelector('textPath')!.textContent).toBe(TEXT);
    expect(angle(el)).toBeNull();
  });

  it('stops observing, drops its frame and its listeners on destroy', async () => {
    const fixture = await render(FocusableHost);
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;
    const observer = StubIntersectionObserver.instances[0];
    view(fixture, true);
    frames.at(0);
    run(3);
    expect(frames.pending).toBe(1);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(frames.cancel).toHaveBeenCalled();
    expect(frames.pending).toBe(0);

    link.dispatchEvent(new Event('pointerenter'));
    link.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(frames.pending).toBe(0);
  });
});
