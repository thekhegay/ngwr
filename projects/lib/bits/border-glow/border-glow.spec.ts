import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBorderGlow } from './border-glow';

@Component({
  imports: [WrBorderGlow],
  template: `
    <wr-border-glow
      [borderRadius]="borderRadius()"
      [glowRadius]="glowRadius()"
      [coneSpread]="coneSpread()"
      [colors]="colors()"
      [backgroundColor]="backgroundColor()"
      [glowColor]="glowColor()"
      [loop]="loop()"
      [speed]="speed()"
    >
      <span class="body">Card</span>
    </wr-border-glow>
  `,
})
class Host {
  readonly borderRadius = signal(28);
  readonly glowRadius = signal(40);
  readonly coneSpread = signal(25);
  readonly colors = signal<readonly string[] | null>(null);
  readonly backgroundColor = signal<string | null>(null);
  readonly glowColor = signal<string | null>(null);
  readonly loop = signal(false);
  readonly speed = signal(6);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Two numbers do all the work here — the angle of the cursor around the centre and
 * how close it is to the perimeter — and both are written onto the host as custom
 * properties for the stylesheet to read. With a stubbed 200×100 box each pointer
 * position has one right answer, including the two that are easy to get wrong:
 * dead centre (no angle, no proximity) and a corner (proximity 1 on the axis that
 * runs out first, not on both).
 */
describe('WrBorderGlow', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-border-glow')!;
  const prop = (name: string): string => host().style.getPropertyValue(name);
  const angle = (): number => Number.parseFloat(prop('--wr-border-glow-angle'));
  const proximity = (): number => Number.parseFloat(prop('--wr-border-glow-edge-proximity'));

  const move = (clientX: number, clientY: number): void => {
    const event = new Event('pointermove', { bubbles: true });
    Object.assign(event, { clientX, clientY, pointerId: 1, isPrimary: true });
    host().dispatchEvent(event);
    fixture.detectChanges();
  };

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    host().getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  };

  beforeEach(() => mount());

  afterEach(() => fixture.destroy());

  it('publishes the geometry the stylesheet reads', () => {
    expect(prop('--wr-border-glow-radius')).toBe('28px');

    fixture.componentInstance.borderRadius.set(4);
    fixture.detectChanges();
    expect(prop('--wr-border-glow-radius')).toBe('4px');
  });

  it('measures the angle from the top, clockwise', () => {
    move(100, 0); // straight up from the centre
    expect(angle()).toBeCloseTo(0, 1);

    move(200, 50); // right
    expect(angle()).toBeCloseTo(90, 1);

    move(100, 100); // down
    expect(angle()).toBeCloseTo(180, 1);

    move(0, 50); // left
    expect(angle()).toBeCloseTo(270, 1);
  });

  it('reports no angle at the exact centre rather than an arbitrary one', () => {
    move(100, 50);

    expect(angle()).toBe(0);
    expect(proximity()).toBe(0);
  });

  it('reaches full proximity at the perimeter and half way between', () => {
    move(200, 50);
    expect(proximity()).toBeCloseTo(100, 1);

    move(150, 50);
    expect(proximity()).toBeCloseTo(50, 1);
  });

  it('takes the nearer edge when the cursor is diagonal', () => {
    // At (200, 100) the horizontal axis runs out at the same moment as the
    // vertical one, so a corner is fully lit — but at (150, 100) the vertical
    // edge is reached first and the value must follow THAT one, not the average.
    move(200, 100);
    expect(proximity()).toBeCloseTo(100, 1);

    move(150, 100);
    expect(proximity()).toBeCloseTo(100, 1);
  });

  it('projects its content', () => {
    expect(host().querySelector('.body')!.textContent).toBe('Card');
  });

  it('refuses colours that would escape the gradients they are composed into', () => {
    // Verbatim from a security audit of 13.0.0. Each entry lands inside
    // `radial-gradient(at <pos>, <colour> 0px, transparent 50%)`, and the
    // background var inside a `linear-gradient()` and a `background` shorthand —
    // so a value balancing the parens around it adds a `url()` the browser
    // fetches. The audit recorded a real request for both.
    fixture.componentInstance.colors.set([
      'red), url("https://beacon.example/borderglow-colors"), radial-gradient(circle at 0% 0%, red',
    ]);
    fixture.componentInstance.backgroundColor.set('url("https://beacon.example/borderglow-bg")');
    fixture.detectChanges();

    expect(prop('--wr-border-glow-gradient-1')).not.toContain('beacon.example');
    expect(prop('--wr-border-glow-bg')).toBe('');

    // A real colour still lands, so the guard costs nothing legitimate.
    fixture.componentInstance.backgroundColor.set('oklch(0.7 0.1 200)');
    fixture.detectChanges();
    expect(prop('--wr-border-glow-bg')).toBe('oklch(0.7 0.1 200)');
  });

  it('still assembles the halo from bare HSL parts', () => {
    fixture.componentInstance.glowColor.set('210 90 60');
    fixture.detectChanges();

    expect(prop('--wr-border-glow-color')).toBe('hsl(210deg 90% 60% / 100%)');
    expect(prop('--wr-border-glow-color-10')).toBe('hsl(210deg 90% 60% / 10%)');
  });

  it('takes any CSS colour for the halo, mixed toward transparent step by step', () => {
    fixture.componentInstance.glowColor.set('var(--wr-color-primary)');
    fixture.detectChanges();

    expect(prop('--wr-border-glow-color')).toBe('color-mix(in srgb, var(--wr-color-primary) 100%, transparent)');
    expect(prop('--wr-border-glow-color-60')).toBe('color-mix(in srgb, var(--wr-color-primary) 60%, transparent)');
    expect(prop('--wr-border-glow-color-10')).toBe('color-mix(in srgb, var(--wr-color-primary) 10%, transparent)');
  });

  it('leaves the halo to the theme for a colour that would escape its color-mix()', () => {
    fixture.componentInstance.glowColor.set('red 1%, transparent), url("https://beacon.example/borderglow-glow"');
    fixture.detectChanges();

    expect(prop('--wr-border-glow-color')).toBe('');
  });

  /**
   * Frames are held and run by hand at a timestamp the test picks, so "the angle
   * advances" is arithmetic rather than a race with the wall clock. The loop moves a
   * full turn per `speed` seconds of frame time; at `speed` 4 that is 9° every 100 ms,
   * and 100 ms is also the most one frame may count, so the steps below stay at it.
   * Angular's own scheduler may park a frame here too — it is harmless to run, which
   * is why nothing below counts frames.
   */
  describe('loop', () => {
    let frames: Map<number, FrameRequestCallback>;
    let nextFrameId: number;

    const runFrame = (ts: number): void => {
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(ts);
    };
    const pointer = (type: 'pointerenter' | 'pointerleave'): void => {
      host().dispatchEvent(new Event(type));
      fixture.detectChanges();
    };
    const startLoop = (): void => {
      fixture.componentInstance.speed.set(4);
      fixture.componentInstance.loop.set(true);
      fixture.detectChanges();
    };

    beforeEach(() => {
      frames = new Map();
      nextFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => {
        frames.set(++nextFrameId, frame);
        return nextFrameId;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
        frames.delete(id);
      });
      // Pinned rather than assumed: with no observer the loop simply runs.
      vi.stubGlobal('IntersectionObserver', undefined);
    });

    afterEach(() => {
      fixture.destroy();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('marks the host and lights the edge in full', () => {
      startLoop();

      expect(host().classList.contains('wr-border-glow--looping')).toBe(true);
      expect(proximity()).toBe(100);
    });

    it('advances the angle by elapsed time, from the resting angle', () => {
      startLoop();

      runFrame(1000);
      expect(angle()).toBeCloseTo(45, 3);
      runFrame(1100);
      expect(angle()).toBeCloseTo(54, 3);
      runFrame(1150);
      expect(angle()).toBeCloseTo(58.5, 3);
    });

    it('counts at most one step for a stalled frame, so a returning tab sees no jump', () => {
      startLoop();
      runFrame(1000);
      runFrame(1100);

      // A minute with no frames — a hidden tab — moves the cone one ordinary step.
      runFrame(61_100);
      expect(angle()).toBeCloseTo(63, 3);
    });

    it('lets the pointer drive while it is over the card, then resumes from where it left', () => {
      startLoop();
      runFrame(1000);
      runFrame(1100);

      pointer('pointerenter');
      move(100, 75); // straight down from the centre, half way to the edge
      expect(angle()).toBeCloseTo(180, 1);
      expect(proximity()).toBeCloseTo(50, 1);

      runFrame(1200);
      runFrame(3000);
      expect(angle()).toBeCloseTo(180, 1);

      pointer('pointerleave');
      expect(proximity()).toBe(100);

      // The first frame back picks up the pointer's angle rather than the loop's own
      // last one; the next moves on from there.
      runFrame(4000);
      expect(angle()).toBeCloseTo(180, 1);
      runFrame(4100);
      expect(angle()).toBeCloseTo(189, 1);
    });

    it('stops asking for frames off screen and picks up without a jump', () => {
      let report: (visible: boolean) => void = () => undefined;
      let disconnected = false;
      class StubObserver {
        constructor(private readonly cb: IntersectionObserverCallback) {}
        observe(): void {
          report = visible =>
            this.cb(
              [{ isIntersecting: visible } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver
            );
        }
        disconnect(): void {
          disconnected = true;
        }
      }
      vi.stubGlobal('IntersectionObserver', StubObserver);
      startLoop();

      report(true);
      runFrame(1000);
      runFrame(1100);
      expect(angle()).toBeCloseTo(54, 3);

      report(false);
      runFrame(2000);
      expect(angle()).toBeCloseTo(54, 3);

      report(true);
      runFrame(9000);
      expect(angle()).toBeCloseTo(54, 3);
      runFrame(9100);
      expect(angle()).toBeCloseTo(63, 3);

      fixture.componentInstance.loop.set(false);
      fixture.detectChanges();
      expect(disconnected).toBe(true);
    });

    it('holds a still, lit edge for someone who asked for less motion', () => {
      mount([{ provide: WrPlatform, useValue: reducedMotion }]);
      startLoop();

      expect(host().classList.contains('wr-border-glow--looping')).toBe(true);
      expect(proximity()).toBe(100);
      expect(angle()).toBe(45);

      runFrame(1000);
      runFrame(3000);
      expect(angle()).toBe(45);
    });

    it('stops writing and drops the modifier when it is turned off', () => {
      startLoop();
      runFrame(1000);
      runFrame(1100);

      fixture.componentInstance.loop.set(false);
      fixture.detectChanges();
      expect(host().classList.contains('wr-border-glow--looping')).toBe(false);

      runFrame(1200);
      runFrame(1300);
      expect(angle()).toBeCloseTo(54, 3);
    });
  });
});
