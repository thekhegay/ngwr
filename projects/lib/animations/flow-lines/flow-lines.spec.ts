import { Directionality } from '@angular/cdk/bidi';
import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_DPR } from '../internal';

import { FLOW_CONTEXT_ATTRIBUTES, FLOW_UNIFORMS, NO_INTRO, createFlowRenderer } from './flow-gl';
import { INK_DARK, INK_LIGHT, WrFlowLines } from './flow-lines';
import {
  BOOST_MAX,
  BOOST_PER_SPEED,
  DAMPING_MIN,
  DAMPING_UNIT,
  FADE_MAX,
  FADE_MIN,
  FADE_SHARE,
  FlowRipples,
  FlowWake,
  INTRO_S,
  INTRO_SOFT,
  INTRO_STAGGER,
  OVERSHOOT,
  PIXELS,
  PUSH,
  PUSH_MAX,
  REST_FRAME_MS,
  RIPPLE_LIFE,
  RIPPLE_MAX,
  RIPPLE_SPEED,
  RIPPLE_WIDTH,
  SEGMENT_MOVE,
  SEGMENT_S,
  SETTLE,
  SPACING_MIN,
  SPRING_RATE,
  WAKE_MAX,
  flowBoost,
  flowDamping,
  flowFade,
  flowFrameMs,
  flowInk,
  flowIntroHead,
  flowLensAt,
  flowPush,
  flowRatio,
  flowRippleAt,
  flowSettle,
  flowSpacing,
  flowStep,
} from './flow-model';

@Component({
  imports: [WrFlowLines],
  template: `<section class="wrap">
    <wr-flow-lines
      [orientation]="orientation()"
      [push]="push()"
      [speed]="speed()"
      [ripple]="ripple()"
      [intro]="intro()"
    />
    <p>Hero</p>
  </section>`,
})
class Host {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly push = signal(1);
  readonly speed = signal(1);
  readonly ripple = signal(true);
  readonly intro = signal(false);
}

/**
 * jsdom has no WebGL. This one accepts every call, hands out distinct objects
 * for what is created and records the uniforms set and the draws, which is
 * what the specs read.
 */
class FakeGL {
  readonly ARRAY_BUFFER = 1;
  readonly STATIC_DRAW = 2;
  readonly BLEND = 3;
  readonly DEPTH_TEST = 4;
  readonly VERTEX_SHADER = 5;
  readonly FRAGMENT_SHADER = 6;
  readonly COMPILE_STATUS = 7;
  readonly LINK_STATUS = 8;
  readonly FRAMEBUFFER = 16;
  readonly COLOR_BUFFER_BIT = 18;
  readonly FLOAT = 19;
  readonly TRIANGLE_STRIP = 20;

  readonly programs: object[] = [];
  readonly deletedPrograms: object[] = [];
  readonly buffers = { created: 0, deleted: 0 };
  readonly draws: { width: number; height: number }[] = [];
  readonly uniforms: Record<string, number[]> = {};
  readonly lost = vi.fn();
  compiles = true;
  private viewportSize = { width: 0, height: 0 };

  getExtension(name: string): unknown {
    return name === 'WEBGL_lose_context' ? { loseContext: this.lost } : null;
  }
  createBuffer(): object {
    this.buffers.created++;
    return {};
  }
  deleteBuffer(): void {
    this.buffers.deleted++;
  }
  createShader(): object {
    return {};
  }
  createProgram(): object {
    const program = {};
    this.programs.push(program);
    return program;
  }
  deleteProgram(program: object): void {
    this.deletedPrograms.push(program);
  }
  viewport(_x: number, _y: number, width: number, height: number): void {
    this.viewportSize = { width, height };
  }
  drawArrays(): void {
    this.draws.push({ ...this.viewportSize });
  }
  getShaderParameter(): boolean {
    return this.compiles;
  }
  getProgramParameter(): boolean {
    return true;
  }
  getUniformLocation(_: object, name: string): object {
    return { name };
  }
  getShaderInfoLog(): string {
    return '';
  }
  getProgramInfoLog(): string {
    return '';
  }
  isContextLost(): boolean {
    return false;
  }
  private readonly set = (location: unknown, ...values: number[]): void => {
    this.uniforms[(location as { name: string }).name] = values;
  };
  private readonly setArray = (location: unknown, values: Float32Array): void => {
    this.uniforms[(location as { name: string }).name] = Array.from(values);
  };
  readonly uniform1f = this.set;
  readonly uniform1i = this.set;
  readonly uniform2f = this.set;
  readonly uniform3f = this.set;
  readonly uniform4f = this.set;
  readonly uniform4fv = this.setArray;
  // The rest is accepted and forgotten.
  readonly bindBuffer = noop;
  readonly bufferData = noop;
  readonly disable = noop;
  readonly shaderSource = noop;
  readonly compileShader = noop;
  readonly attachShader = noop;
  readonly bindAttribLocation = noop;
  readonly linkProgram = noop;
  readonly deleteShader = noop;
  readonly useProgram = noop;
  readonly bindFramebuffer = noop;
  readonly clearColor = noop;
  readonly clear = noop;
  readonly enableVertexAttribArray = noop;
  readonly vertexAttribPointer = noop;
}

const noop = (): void => undefined;

const asGL = (fake: FakeGL): WebGLRenderingContext => fake as unknown as WebGLRenderingContext;

class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.instances.push(this);
  }
  fire(width: number, height: number): void {
    const entry = { contentRect: { width, height } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const pointer = (type: string, init: PointerEventInit): PointerEvent => {
  // jsdom has no PointerEvent constructor; a MouseEvent with the type set does.
  const event = new MouseEvent(type, { bubbles: true, ...init }) as PointerEvent;
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
};

const DAMPING = flowDamping(1);

describe('flowSpacing and flowDamping', () => {
  it('floors the spacing and turns the bounce into a damping ratio within its bounds', () => {
    expect(flowSpacing(10)).toBe(10);
    expect(flowSpacing(1)).toBe(SPACING_MIN);
    expect(flowSpacing(NaN)).toBe(SPACING_MIN);
    expect(flowDamping(1)).toBeCloseTo(DAMPING_UNIT, 9);
    expect(flowDamping(0)).toBe(1);
    expect(flowDamping(-3)).toBe(1);
    expect(flowDamping(10)).toBe(DAMPING_MIN);
    expect(flowDamping(NaN)).toBeCloseTo(DAMPING_UNIT, 9);
  });
});

describe('flowStep', () => {
  it('is a step response: nothing before the push, past one at its peak by the overshoot, settled on one after a second and a half', () => {
    expect(flowStep(-1, SPRING_RATE, DAMPING)).toBe(0);
    expect(flowStep(0, SPRING_RATE, DAMPING)).toBe(0);
    let peak = 0;
    for (let t = 0; t < 2; t += 0.001) peak = Math.max(peak, flowStep(t, SPRING_RATE, DAMPING));
    expect(peak).toBeCloseTo(OVERSHOOT, 3);
    expect(OVERSHOOT).toBeGreaterThan(1.2);
    expect(Math.abs(flowStep(1, SPRING_RATE, DAMPING) - 1)).toBeLessThan(0.1);
    expect(Math.abs(flowStep(1.5, SPRING_RATE, DAMPING) - 1)).toBeLessThan(0.03);
    expect(Math.abs(flowStep(flowSettle(SPRING_RATE, DAMPING), SPRING_RATE, DAMPING) - 1)).toBeLessThan(SETTLE * 1.1);
  });

  it('never crosses one at the critical damping, and settles there', () => {
    for (let t = 0; t < 3; t += 0.01) {
      const s = flowStep(t, SPRING_RATE, 1);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
    expect(flowStep(2, SPRING_RATE, 1)).toBeGreaterThan(0.99);
  });

  it('is continuous where the two forms meet', () => {
    expect(flowStep(0.3, SPRING_RATE, 0.9999)).toBeCloseTo(flowStep(0.3, SPRING_RATE, 1), 3);
  });
});

describe('flowLensAt', () => {
  it('is nothing at the centre and the reach, and the whole push at about 0.45 of the reach', () => {
    expect(flowLensAt(0, 160)).toBe(0);
    expect(flowLensAt(160, 160)).toBe(0);
    expect(flowLensAt(200, 160)).toBe(0);
    expect(flowLensAt(0, 0)).toBe(0);
    let peak = 0;
    let at = 0;
    for (let r = 0; r < 160; r += 0.1) {
      const lens = flowLensAt(r, 160);
      if (lens > peak) {
        peak = lens;
        at = r;
      }
    }
    expect(peak).toBeCloseTo(1, 4);
    expect(at / 160).toBeCloseTo(Math.sqrt(0.2), 2);
  });
});

describe('flowPush', () => {
  it('moves a seventh of the reach under a unit push, scales with it and never past the fold bound', () => {
    expect(flowPush(1, 160)).toBeCloseTo(PUSH * 160, 6);
    expect(flowPush(1.2, 160)).toBeCloseTo(PUSH * 1.2 * 160, 6);
    expect(flowPush(10, 160)).toBeCloseTo(PUSH_MAX * 160, 6);
    expect(flowPush(0, 160)).toBe(0);
    expect(flowPush(-1, 160)).toBe(0);
    expect(flowPush(NaN, 160)).toBeCloseTo(PUSH * 160, 6);
  });
});

describe('FlowWake', () => {
  const settle = flowSettle(SPRING_RATE, DAMPING);

  it('opens a segment where the pointer lands and its weight climbs the step response while it stays', () => {
    const wake = new FlowWake();
    wake.move(100, 50, 0);
    expect(wake.pressed()).toBe(true);
    expect(wake.update(0, 40, 160, SPRING_RATE, DAMPING)).toBe(1);
    expect(Array.from(wake.data.subarray(0, 4))).toEqual([100, 50, 0, 0]);
    expect(Array.from(wake.box)).toEqual([-60, -110, 260, 210]);

    wake.update(0.1, 40, 160, SPRING_RATE, DAMPING);
    expect(wake.data[2]).toBeCloseTo(40 * flowStep(0.1, SPRING_RATE, DAMPING), 4);
    wake.update(4, 40, 160, SPRING_RATE, DAMPING);
    expect(wake.data[2]).toBeCloseTo(40, 2);
  });

  it('slides a young segment, splits an older one once the pointer has moved, and ignores a twitch', () => {
    const wake = new FlowWake();
    wake.move(100, 50, 0);
    wake.move(104, 50, SEGMENT_S / 2);
    expect(wake.segments).toHaveLength(1);
    expect(wake.segments[0].x).toBe(104);

    wake.move(105, 50, SEGMENT_S * 2);
    expect(wake.segments).toHaveLength(1);
    wake.move(104 + SEGMENT_MOVE, 50, SEGMENT_S * 2);
    expect(wake.segments).toHaveLength(2);
    expect(wake.segments[0].end).toBe(SEGMENT_S * 2);
    expect(wake.segments[1].start).toBe(SEGMENT_S * 2);
    expect(wake.segments[1].end).toBe(Infinity);
  });

  it('weights a closed segment by the difference of two step responses, so it swings back and settles, and then drops it', () => {
    const wake = new FlowWake();
    wake.move(100, 50, 0);
    wake.release(1);
    expect(wake.pressed()).toBe(false);
    wake.update(1.02, 40, 160, SPRING_RATE, DAMPING);
    expect(wake.data[2]).toBeCloseTo(
      40 * (flowStep(1.02, SPRING_RATE, DAMPING) - flowStep(0.02, SPRING_RATE, DAMPING)),
      4
    );
    // Past its place on the way back: the bounce.
    let under = false;
    for (let t = 1; t < 2; t += 0.01) {
      wake.update(t, 40, 160, SPRING_RATE, DAMPING);
      if (wake.data[2] < -0.5) under = true;
    }
    expect(under).toBe(true);
    expect(wake.update(1 + settle + 0.01, 40, 160, SPRING_RATE, DAMPING)).toBe(0);
    expect(wake.segments).toHaveLength(0);
    expect(Array.from(wake.box)).toEqual([0, 0, 0, 0]);
  });

  it('is bounded under a long sweep: the weights telescope to one step response, and the ring never grows past its cap', () => {
    const wake = new FlowWake();
    let now = 0;
    for (let i = 0; i < 200; i++) {
      now = i * 0.04;
      wake.move(i * 10, 50, now);
    }
    expect(wake.segments.length).toBeLessThanOrEqual(WAKE_MAX);
    wake.update(now, 1, 160, SPRING_RATE, DAMPING);
    let total = 0;
    for (let i = 0; i < wake.count; i++) total += wake.data[i * 4 + 2];
    expect(total).toBeLessThanOrEqual(OVERSHOOT * BOOST_MAX + 1e-6);
    expect(total).toBeGreaterThan(0.5);
  });

  it('is robust to a long frame: the weights come from the clock, not from a step', () => {
    const wake = new FlowWake();
    wake.move(100, 50, 0);
    wake.release(0.5);
    const fine = new FlowWake();
    fine.move(100, 50, 0);
    fine.release(0.5);
    for (let t = 0; t <= 1.2; t += 0.001) fine.update(t, 40, 160, SPRING_RATE, DAMPING);
    wake.update(1.2, 40, 160, SPRING_RATE, DAMPING);
    expect(wake.data[2]).toBeCloseTo(fine.data[2], 6);
  });

  it('pushes harder for a segment laid at speed, up to the cap, and not for the first or a crawl', () => {
    expect(flowBoost(0, 0)).toBe(1);
    expect(flowBoost(10, 0)).toBe(1);
    expect(flowBoost(600, 1)).toBeCloseTo(1 + 600 * BOOST_PER_SPEED, 9);
    expect(flowBoost(5000, 1)).toBe(BOOST_MAX);
    const wake = new FlowWake();
    wake.move(0, 0, 0);
    wake.move(60, 0, 0.05);
    expect(wake.segments[0].boost).toBe(1);
    expect(wake.segments[1].boost).toBeCloseTo(flowBoost(60, 0.05), 9);
    const slow = new FlowWake();
    slow.move(0, 0, 0);
    slow.move(60, 0, 2);
    wake.update(0.3, 40, 160, SPRING_RATE, DAMPING);
    slow.update(2.25, 40, 160, SPRING_RATE, DAMPING);
    expect(wake.data[6]).toBeGreaterThan(slow.data[6]);
  });

  it('forgets everything on clear', () => {
    const wake = new FlowWake();
    wake.move(1, 2, 0);
    wake.update(0.1, 40, 160, SPRING_RATE, DAMPING);
    wake.clear();
    expect(wake.segments).toHaveLength(0);
    expect(wake.count).toBe(0);
  });
});

describe('FlowRipples and flowRippleAt', () => {
  it('keeps three at most, lays their age and crest, and drops the spent', () => {
    const ripples = new FlowRipples();
    ripples.add(10, 20, 0);
    ripples.add(30, 40, 0.2);
    ripples.add(50, 60, 0.4);
    ripples.add(70, 80, 0.6);
    expect(ripples.ripples).toHaveLength(RIPPLE_MAX);
    expect(ripples.update(1)).toBe(3);
    expect(Array.from(ripples.data.subarray(0, 2))).toEqual([30, 40]);
    expect(ripples.data[2]).toBeCloseTo(0.8, 5);
    expect(ripples.data[3]).toBeGreaterThan(0);
    expect(ripples.update(0.2 + RIPPLE_LIFE)).toBe(2);
    expect(ripples.data[0]).toBe(50);
    ripples.clear();
    expect(ripples.update(2)).toBe(0);
  });

  it('is a ring riding out at the ripple speed, fading as it goes and gone at the end of its life', () => {
    expect(flowRippleAt(100, 0)).toBe(0);
    expect(flowRippleAt(100, RIPPLE_LIFE)).toBe(0);
    const age = 0.5;
    const crest = age * RIPPLE_SPEED;
    expect(flowRippleAt(crest, age)).toBeCloseTo(
      ((1 - age / RIPPLE_LIFE) * crest) / Math.hypot(crest, RIPPLE_WIDTH),
      6
    );
    expect(flowRippleAt(0, age)).toBe(0);
    expect(flowRippleAt(crest + 200, age)).toBeLessThan(0.01);
    expect(flowRippleAt(crest - 200, age)).toBeLessThan(0.01);
    expect(flowRippleAt(RIPPLE_SPEED, 1)).toBeLessThan(flowRippleAt(crest, age));
  });
});

describe('flowIntroHead', () => {
  it('eases out from the start edge past the far one plus the stagger and softness, then is gone', () => {
    expect(flowIntroHead(0, 1000)).toBe(0);
    const mid = flowIntroHead(INTRO_S / 2, 1000);
    expect(mid).toBeGreaterThan(500);
    expect(mid).toBeLessThan(1000 + INTRO_STAGGER + INTRO_SOFT);
    expect(flowIntroHead(INTRO_S * 0.999, 1000)).toBeGreaterThan(1000 + INTRO_STAGGER + INTRO_SOFT - 1);
    expect(flowIntroHead(INTRO_S, 1000)).toBe(Infinity);
    expect(flowIntroHead(-1, 1000)).toBe(0);
  });
});

describe('flowRatio', () => {
  it('follows the device ratio up to the cap and the budget, never under one', () => {
    expect(flowRatio(800, 400, 1)).toBe(1);
    expect(flowRatio(800, 400, 2)).toBe(2);
    expect(flowRatio(800, 400, 3)).toBe(MAX_DPR);
    expect(flowRatio(1920, 900, 2)).toBeCloseTo(Math.sqrt(PIXELS / (1920 * 900)), 6);
    expect(flowRatio(4000, 3000, 2)).toBe(1);
    expect(flowRatio(0, 0, 2)).toBe(2);
  });
});

describe('flowFrameMs, flowFade and flowInk', () => {
  it('holds thirty frames a second at rest and lifts the cap while something is live', () => {
    expect(flowFrameMs(false)).toBe(REST_FRAME_MS);
    expect(REST_FRAME_MS).toBeCloseTo(1000 / 30, 6);
    expect(flowFrameMs(true)).toBe(0);
  });

  it('fades a share of the shorter side within its bounds', () => {
    expect(flowFade(1400, 600)).toBeCloseTo(FADE_SHARE * 600, 6);
    expect(flowFade(300, 100)).toBe(FADE_MIN);
    expect(flowFade(4000, 2000)).toBe(FADE_MAX);
  });

  it('lays ink on a light surface and lights the lines on a dark one', () => {
    expect(flowInk([1, 1, 1])).toBe(true);
    expect(flowInk([0.07, 0.08, 0.1])).toBe(false);
  });
});

describe('createFlowRenderer', () => {
  const frame = (): Parameters<NonNullable<ReturnType<typeof createFlowRenderer>>['render']>[0] => ({
    width: 800,
    height: 300,
    scale: 1,
    regionWidth: 800,
    regionHeight: 300,
    cos: 1,
    sin: 0,
    mirror: 1,
    spacing: 10,
    halfWidth: 0.5,
    ink: 0.3,
    amplitude: 28,
    frequency: 1 / 220,
    across: 0.7,
    time: 1.5,
    color: new Float32Array([0.1, 0.1, 0.1]),
    accent: new Float32Array([0.2, 0.4, 0.9]),
    wake: new Float32Array(WAKE_MAX * 4),
    wakeCount: 2,
    wakeBox: new Float32Array([1, 2, 3, 4]),
    reach: 160,
    push: 40,
    ripples: new Float32Array(RIPPLE_MAX * 4),
    rippleCount: 1,
    rippleSpeed: 420,
    rippleWidth: 60,
    rippleLife: 1.8,
    dashPeriod: 56,
    dashDuty: 0.55,
    dashOffset: -12,
    dashed: true,
    introHead: Infinity,
    introStagger: INTRO_STAGGER,
    introSoft: INTRO_SOFT,
    fade: 72,
  });

  it('compiles one program and frees it with the quad on destroy', () => {
    const gl = new FakeGL();
    const renderer = createFlowRenderer(asGL(gl))!;
    expect(renderer).not.toBeNull();
    expect(gl.programs).toHaveLength(1);
    renderer.destroy();
    expect(gl.buffers.deleted).toBe(gl.buffers.created);
    expect(gl.deletedPrograms).toHaveLength(1);
  });

  it('draws one quad per frame onto the canvas, with every uniform set', () => {
    const gl = new FakeGL();
    const renderer = createFlowRenderer(asGL(gl))!;
    renderer.render(frame());

    expect(gl.draws).toEqual([{ width: 800, height: 300 }]);
    expect(Object.keys(gl.uniforms).sort()).toEqual([...FLOW_UNIFORMS].sort());
    expect(gl.uniforms['uWakeCount']).toEqual([2]);
    expect(gl.uniforms['uWake']).toHaveLength(WAKE_MAX * 4);
    expect(gl.uniforms['uWakeBox']).toEqual([1, 2, 3, 4]);
    expect(gl.uniforms['uReach']).toEqual([160, 40]);
    expect(gl.uniforms['uRipple']).toHaveLength(RIPPLE_MAX * 4);
    expect(gl.uniforms['uDash']).toEqual([56, 0.55, -12, 1]);
    // No intro: the head stands in for infinity, and the half length is the width's half for level lines.
    expect(gl.uniforms['uIntro']).toEqual([NO_INTRO, INTRO_STAGGER, 400, INTRO_SOFT]);
    expect(gl.uniforms['uFade']).toEqual([72]);
  });

  it('passes a live intro head through and measures the half length along a tilted axis', () => {
    const gl = new FakeGL();
    const renderer = createFlowRenderer(asGL(gl))!;
    const angle = Math.PI / 6;
    renderer.render({ ...frame(), cos: Math.cos(angle), sin: Math.sin(angle), introHead: 250, dashed: false });
    const half = (800 * Math.cos(angle) + 300 * Math.sin(angle)) / 2;
    expect(gl.uniforms['uIntro'][0]).toBe(250);
    expect(gl.uniforms['uIntro'][2]).toBeCloseTo(half, 6);
    expect(gl.uniforms['uDash'][3]).toBe(0);
  });

  it('is null where a shader does not compile', () => {
    const gl = new FakeGL();
    gl.compiles = false;
    expect(createFlowRenderer(asGL(gl))).toBeNull();
    expect(gl.deletedPrograms).toHaveLength(0);
  });
});

describe('WrFlowLines', () => {
  let gl: FakeGL;
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  let frames: FrameRequestCallback[];
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;
  let thrown: unknown[];
  /** The frames' clock: `performance.now()` reads the last tick, as the two share one clock in a browser. */
  let clock: number;

  const render = async (
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...(providers as never[]),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    // Stubbed after the first render, so Angular's own scheduling does not count.
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    return fixture;
  };

  const wrap = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.wrap')!;
  const host = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('wr-flow-lines')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.wr-flow-lines__canvas')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    clock = now;
    const queued = frames;
    frames = [];
    queued.forEach(frame => frame(now));
  };

  /** How many of the component's own frames are queued: Angular's scheduler asks for frames too, once a signal moves. */
  const pending = (): number => frames.filter(frame => frame.name === 'frameLoop').length;

  /** Sizes the host as the browser would: the size notification, then its frame. */
  const layout = (width: number, height: number): void => {
    StubResizeObserver.instances[0].fire(width, height);
    tick(0);
  };

  const inView = (): void => StubIntersectionObserver.instances[0].fire(true);

  const move = (target: HTMLElement, x: number, y: number, pointerType = 'mouse'): void => {
    target.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y, pointerType }));
  };

  const press = (target: HTMLElement, x: number, y: number, pointerType = 'mouse', button = 0): void => {
    target.dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y, pointerType, button }));
  };

  const wakeCount = (): number => gl.uniforms['uWakeCount'][0];
  const rippleCount = (): number => gl.uniforms['uRippleCount'][0];

  beforeEach(() => {
    thrown = [];
    clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    gl = new FakeGL();
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(((kind: string) =>
        kind === 'webgl' ? gl : null) as unknown as HTMLCanvasElement['getContext']);
    frames = [];
    raf = vi.fn((frame: FrameRequestCallback) => frames.push(frame));
    caf = vi.fn();
    StubResizeObserver.instances = [];
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    expect(thrown).toEqual([]);
  });

  it('renders the empty canvas on the server, absolutely positioned by the sheet, and asks for nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas(fixture)).not.toBeNull();
    expect(canvas(fixture).getAttribute('width')).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('is decorative: hidden from assistive tech, no text, nothing focusable, before the content', async () => {
    const fixture = await render();
    const el = host(fixture);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('Hero');
  });

  it('watches the host for size and view, and asks for a context only once it is sized and on screen', async () => {
    const fixture = await render();
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));

    layout(800, 300);
    expect(getContext).not.toHaveBeenCalled();
    expect(pending()).toBe(0);

    inView();
    expect(pending()).toBe(1);
    tick(40);
    expect(getContext).toHaveBeenCalledWith('webgl2', FLOW_CONTEXT_ATTRIBUTES);
    expect(getContext).toHaveBeenCalledWith('webgl', FLOW_CONTEXT_ATTRIBUTES);
    expect(gl.programs).toHaveLength(1);
    expect(gl.draws).toHaveLength(1);
  });

  it('sizes the canvas to the host under the pixel budget and lays the lines ten px apart, one px thick, faded at the edges', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    // jsdom's device ratio is one, so the canvas is the host's size.
    expect(canvas(fixture).width).toBe(800);
    expect(canvas(fixture).height).toBe(300);
    expect(gl.draws[0]).toEqual({ width: 800, height: 300 });
    expect(gl.uniforms['uSize']).toEqual([800, 300]);
    expect(gl.uniforms['uScale']).toEqual([1]);
    expect(gl.uniforms['uLine'][0]).toBe(10);
    expect(gl.uniforms['uLine'][1]).toBe(0.5);
    // jsdom resolves no colour: the fallbacks are a light surface's.
    expect(gl.uniforms['uLine'][2]).toBe(INK_LIGHT);
    expect(INK_DARK).toBeGreaterThan(INK_LIGHT);
    expect(gl.uniforms['uFade']).toEqual([flowFade(800, 300)]);
    expect(gl.uniforms['uAxis']).toEqual([1, 0, 1]);
    expect(gl.uniforms['uIntro'][0]).toBe(NO_INTRO);
  });

  it('keeps the loop going and draws at most thirty frames a second at rest, with the drift moving on', async () => {
    await render();
    layout(800, 300);
    inView();
    expect(pending()).toBe(1);

    // Too soon after the loop started: the frame is skipped whole, and the loop asks for the next.
    tick(16);
    expect(gl.draws).toHaveLength(0);
    expect(pending()).toBe(1);
    tick(40);
    expect(gl.draws).toHaveLength(1);
    const time = gl.uniforms['uNoise'][3];
    tick(56);
    expect(gl.draws).toHaveLength(1);
    tick(74);
    expect(gl.draws).toHaveLength(2);
    expect(gl.uniforms['uNoise'][3]).toBeGreaterThan(time);
  });

  it('pushes the lines around the mouse, at the screen rate, and lets them settle after it leaves', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);
    expect(wakeCount()).toBe(0);

    move(wrap(fixture), 400, 150);
    tick(56);
    tick(72);
    // Every frame drawn now: the wake is live.
    expect(gl.draws).toHaveLength(3);
    expect(wakeCount()).toBe(1);
    expect(gl.uniforms['uWake'].slice(0, 2)).toEqual([400, 150]);
    expect(gl.uniforms['uWake'][2]).toBeGreaterThan(0);
    expect(gl.uniforms['uReach']).toEqual([160, flowPush(1, 160)]);
    const weight = gl.uniforms['uWake'][2];

    let now = 72;
    for (let i = 0; i < 30; i++) tick((now += 16));
    expect(gl.uniforms['uWake'][2]).toBeGreaterThan(weight);
    // A sweep lays a trail of segments behind the pointer.
    for (let i = 0; i < 10; i++) {
      move(wrap(fixture), 400 + i * 20, 150);
      tick((now += 40));
    }
    expect(wakeCount()).toBeGreaterThan(3);

    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    for (let i = 0; i < 200; i++) tick((now += 16));
    expect(wakeCount()).toBe(0);
    // Back to the rest cap: a frame 16ms after a drawn one is skipped.
    tick((now += 40));
    const drawn = gl.draws.length;
    tick(now + 16);
    expect(gl.draws).toHaveLength(drawn);
  });

  it('sends a ripple out from a click, from a tap too, and not from another button or with the ripple off', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    press(wrap(fixture), 200, 100);
    tick(56);
    expect(rippleCount()).toBe(1);
    expect(gl.uniforms['uRipple'].slice(0, 2)).toEqual([200, 100]);
    expect(gl.uniforms['uRipple'][2]).toBeCloseTo(0.016, 3);

    press(wrap(fixture), 300, 100, 'touch');
    tick(72);
    expect(rippleCount()).toBe(2);

    press(wrap(fixture), 300, 100, 'mouse', 2);
    tick(88);
    expect(rippleCount()).toBe(2);

    let now = 88;
    for (let i = 0; i < 150; i++) tick((now += 16));
    expect(rippleCount()).toBe(0);

    fixture.componentInstance.ripple.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    press(wrap(fixture), 200, 100);
    tick(now + 16);
    expect(rippleCount()).toBe(0);
  });

  it('ignores a moving finger, and pushes nothing when the push is turned off', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    move(wrap(fixture), 400, 150, 'touch');
    tick(50);
    tick(84);
    expect(wakeCount()).toBe(0);

    fixture.componentInstance.push.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    move(wrap(fixture), 400, 150);
    tick(120);
    tick(154);
    expect(wakeCount()).toBe(0);
  });

  it('listens on the parent, passively, and never on the host or its canvas', async () => {
    const fixture = await render();
    const add = vi.spyOn(wrap(fixture), 'addEventListener');
    const addHost = vi.spyOn(host(fixture), 'addEventListener');
    layout(800, 300);
    inView();
    tick(40);
    expect(addHost).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    // The listeners went on at mount, before the spy: a move still reaches them.
    move(wrap(fixture), 100, 100);
    tick(56);
    expect(wakeCount()).toBe(1);
  });

  it('rests the loop at no speed once the wake has settled, and wakes it for a push', async () => {
    const fixture = await render();
    fixture.componentInstance.speed.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    layout(800, 300);
    inView();
    // Nothing moves: one still frame, no loop.
    expect(pending()).toBe(0);
    expect(gl.draws).toHaveLength(1);

    move(wrap(fixture), 400, 150);
    expect(pending()).toBe(1);
    let now = 0;
    for (let i = 0; i < 5; i++) tick((now += 16));
    expect(wakeCount()).toBe(1);
    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    for (let i = 0; i < 200; i++) tick((now += 16));
    expect(wakeCount()).toBe(0);
    expect(pending()).toBe(0);
  });

  it('draws the lines in from the start edge on first view when the intro is on', async () => {
    const fixture = await render();
    fixture.componentInstance.intro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uIntro'][0]).toBe(0);
    tick(56);
    tick(72);
    // Every frame while the head moves, and the head moves.
    expect(gl.draws).toHaveLength(3);
    const head = gl.uniforms['uIntro'][0];
    expect(head).toBeGreaterThan(0);
    expect(head).toBeLessThan(800);

    let now = 72;
    for (let i = 0; i < 200; i++) tick((now += 16));
    expect(gl.uniforms['uIntro'][0]).toBe(NO_INTRO);
  });

  it('runs no loop off screen or with the page hidden, and picks up when they come back', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(800, 300);
    expect(pending()).toBe(0);

    inView();
    expect(pending()).toBe(1);
    tick(40);

    page.pageVisible.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caf).toHaveBeenCalled();
    tick(56);
    expect(pending()).toBe(0);

    page.pageVisible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending()).toBe(1);

    StubIntersectionObserver.instances[0].fire(false);
    tick(72);
    expect(pending()).toBe(0);
  });

  it('draws one still frame under reduced motion, whole and at rest, and stops a running loop when it is turned on', async () => {
    const page = stub(true);
    const fixture = await render([platform(page)]);
    fixture.componentInstance.intro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    layout(800, 300);
    inView();

    expect(pending()).toBe(0);
    expect(gl.draws).toHaveLength(1);
    expect(wakeCount()).toBe(0);
    expect(gl.uniforms['uIntro'][0]).toBe(NO_INTRO);
    move(wrap(fixture), 400, 150);
    press(wrap(fixture), 400, 150);
    expect(gl.draws).toHaveLength(1);
    expect(pending()).toBe(0);

    page.prefersReducedMotion.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending()).toBe(1);
    tick(40);
    move(wrap(fixture), 400, 150);
    tick(56);
    expect(wakeCount()).toBe(1);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caf).toHaveBeenCalled();
    tick(72);
    expect(pending()).toBe(0);
    expect(wakeCount()).toBe(0);
  });

  it('runs the lines from top to bottom under the vertical orientation', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uAxis'][0]).toBeCloseTo(1, 6);
    expect(gl.uniforms['uAxis'][1]).toBeCloseTo(0, 6);

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    await fixture.whenStable();
    tick(90);
    expect(gl.uniforms['uAxis'][0]).toBeCloseTo(0, 6);
    expect(gl.uniforms['uAxis'][1]).toBeCloseTo(1, 6);
  });

  it('mirrors the field under RTL', async () => {
    const dir = { valueSignal: signal<'ltr' | 'rtl'>('ltr'), value: 'ltr' };
    const fixture = await render([platform(stub()), { provide: Directionality, useValue: dir }]);
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uAxis'][2]).toBe(1);

    dir.valueSignal.set('rtl');
    fixture.detectChanges();
    await fixture.whenStable();
    tick(90);
    expect(gl.uniforms['uAxis'][2]).toBe(-1);
  });

  it('drops the renderer when the context is lost and rebuilds it when it is restored', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas(fixture).dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    tick(56);
    expect(pending()).toBe(0);

    canvas(fixture).dispatchEvent(new Event('webglcontextrestored'));
    expect(gl.programs).toHaveLength(2);
    expect(pending()).toBe(1);
    const draws = gl.draws.length;
    tick(100);
    expect(gl.draws).toHaveLength(draws + 1);
  });

  it('survives a browser that gives no context, and asks only once', async () => {
    getContext.mockImplementation(() => null);
    await render();
    layout(800, 300);
    inView();
    tick(40);
    tick(50);
    tick(84);

    expect(getContext).toHaveBeenCalledTimes(2);
    expect(gl.draws).toHaveLength(0);
  });

  it('frees the program and the context, and stops listening, on destroy', async () => {
    const fixture = await render();
    const remove = vi.spyOn(wrap(fixture), 'removeEventListener');
    layout(800, 300);
    inView();
    tick(40);

    fixture.destroy();

    expect(caf).toHaveBeenCalled();
    expect(gl.buffers.deleted).toBe(gl.buffers.created);
    expect(gl.deletedPrograms).toHaveLength(1);
    expect(gl.lost).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(remove.mock.calls.map(c => c[0]).sort()).toEqual(['pointerdown', 'pointerleave', 'pointermove']);
  });
});
