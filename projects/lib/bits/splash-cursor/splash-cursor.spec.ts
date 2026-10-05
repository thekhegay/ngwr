import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSplashCursor } from './splash-cursor';

@Component({
  imports: [WrSplashCursor],
  template: `<wr-splash-cursor [fullscreen]="fullscreen()" [rainbow]="rainbow()" />`,
})
class Host {
  readonly fullscreen = signal(true);
  readonly rainbow = signal(true);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * A WebGL fluid simulation that follows the pointer. jsdom refuses the context, which
 * is the state half this spec is for: a refused context is a real browser answer (an
 * old machine, a blocklisted driver, a headless run), and the component has to put
 * its canvas up and stop.
 *
 * The component itself is thirty lines — one effect that reads every input into a
 * config, refuses to boot under reduced motion, hands the canvas to
 * `createFluidSimulation()` and registers the teardown it gets back. That wiring is
 * what these tests are about, and none of it was reachable while the sim returned
 * null on its first line: "tears down cleanly" passed on a component with no teardown
 * registered at all, because there was none to register.
 *
 * So the context-bearing tests mount `withContext()`. It is an all-yes WebGL2 stub,
 * and the honesty of that is worth stating plainly: it lets the sim's real boot path
 * run — it compiles its shaders, negotiates its texture formats, builds its
 * framebuffers, installs its four window listeners and starts its frame loop — but
 * every answer it gets back is invented, so a passing run says the sim BOOTED, never
 * that it painted anything correct. Pixels are the one thing jsdom can never speak
 * to, here or anywhere in this set.
 */

/** Everything the boot effect threw. */
let thrown: unknown[];
/** `drawElements` calls — the passes of the sim's own render, and the only sign it is running. */
let drawn: number;
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/**
 * `getContext` — one spy for the whole file, because how often the canvas was ASKED
 * is what separates "refused" from "never tried", and a second spy layered on top of
 * this one would record nothing.
 */
let asked: MockInstance<HTMLCanvasElement['getContext']>;

const ACTIVE_UNIFORMS = 0x8b86;
const FRAMEBUFFER_COMPLETE = 0x8cd5;

/**
 * Enough of WebGL2 for `createFluidSimulation()` to reach its last line, and nothing
 * more.
 *
 * Four answers have to be real rather than no-ops, and each one is a branch that
 * would otherwise send the boot down its failure path: the shader and program status
 * queries (a stub that says otherwise makes the sim log a shader error that is the
 * stub's fault), the active-uniform count, and framebuffer completeness — which is
 * compared against `gl.FRAMEBUFFER_COMPLETE`, so the constant and the answer have to
 * be the same number or the format negotiation recurses into `null` and the sim never
 * starts. `drawingBufferWidth` / `Height` are numbers for the same reason: the
 * resolution maths divides them.
 */
const withContext = (): void => {
  const gl: Record<string, unknown> = {
    ACTIVE_UNIFORMS,
    FRAMEBUFFER_COMPLETE,
    TEXTURE0: 0x84c0,
    drawingBufferWidth: 300,
    drawingBufferHeight: 150,
    getShaderParameter: () => true,
    getProgramParameter: (_program: unknown, pname: number) => (pname === ACTIVE_UNIFORMS ? 0 : true),
    checkFramebufferStatus: () => FRAMEBUFFER_COMPLETE,
    drawElements: () => {
      drawn++;
    },
  };
  // Every other name is a no-op, memoised per key so that `gl.SOMETHING` is at least
  // equal to itself — a fresh value each read makes the sim's own constant
  // comparisons answer at random.
  const cache = new Map<string, unknown>();
  const context = new Proxy(gl, {
    get: (target, key) => {
      if (key in target) return target[key as string];
      const name = key as string;
      if (!cache.has(name)) cache.set(name, (): void => undefined);
      return cache.get(name);
    },
  });
  asked.mockImplementation(((type: string) => (type === 'webgl2' ? context : null)) as never);

  // Frames are held, not fired: a backgrounded jsdom throttles timers, and a spec
  // that waits on one flakes. Angular's own scheduler races rAF against a
  // `setTimeout`, so holding the frame does not stall the fixture.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
};

/** Run every frame the page is currently holding, once. */
const runFrame = (): void => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(16);
};

describe('WrSplashCursor', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let listen: MockInstance<typeof window.addEventListener>;
  let drop: MockInstance<typeof window.removeEventListener>;

  const canvas = (): HTMLCanvasElement | null => (fixture.nativeElement as HTMLElement).querySelector('canvas');
  const booted = (): number => listen.mock.calls.filter(call => call[0] === 'mousedown').length;
  const stopped = (): number => drop.mock.calls.filter(call => call[0] === 'mousedown').length;

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...providers,
      ] as never[],
    });
    // Every recorder is counted from here, so the mount's own boot is in the tally
    // and the throwaway one `beforeEach` made is not.
    thrown = [];
    drawn = 0;
    frames = [];
    asked.mockClear();
    listen = vi.spyOn(window, 'addEventListener');
    drop = vi.spyOn(window, 'removeEventListener');
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // The refused context is the default state — jsdom's own answer, left in place.
    asked = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('renders a canvas that is decoration, not content', () => {
    expect(canvas()).not.toBeNull();
    expect(canvas()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('survives a browser with no WebGL', () => {
    // It asked, was refused, and stopped there: nothing is listening on the window
    // and nothing was reported to the handler, which is the only place a failure in
    // this effect would surface.
    expect(asked).toHaveBeenCalled();
    expect(thrown).toEqual([]);
    expect(booted()).toBe(0);
  });

  it('boots the simulation and keeps it painting', async () => {
    withContext();
    await mount();

    // Four window listeners and a first render, all of it from the sim's real boot
    // path — see the note above on what an all-yes context can and cannot say.
    expect(booted()).toBe(1);
    expect(drawn).toBeGreaterThan(0);

    const first = drawn;
    runFrame();

    expect(drawn).toBeGreaterThan(first);
  });

  it('never asks for a context for someone who asked for less motion', async () => {
    // With a working context available, so the refusal is a decision rather than
    // the environment answering for it.
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    // The guard is in front of the whole sim, so the cheapest possible reading of
    // it is that the canvas was never even queried.
    expect(asked).not.toHaveBeenCalled();
    expect(booted()).toBe(0);
    expect(canvas()).not.toBeNull();
  });

  it('reboots on the same canvas when an input changes, taking the old one down first', async () => {
    withContext();
    await mount();
    expect(booted()).toBe(1);

    fixture.componentInstance.rainbow.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // `rainbow` reaches the sim only through the config the effect rebuilds, so a
    // reboot is the whole mechanism by which the input has any effect at all —
    // and `onCleanup` is what stops the previous one from listening forever.
    expect(booted()).toBe(2);
    expect(stopped()).toBe(1);
  });

  it('takes its listeners and its loop with it when destroyed', async () => {
    withContext();
    await mount();

    fixture.destroy();

    expect(stopped()).toBe(1);

    // And it really stopped: a held frame that still ran would keep a whole fluid
    // simulation alive on a page that no longer shows it.
    const last = drawn;
    runFrame();
    expect(drawn).toBe(last);
  });

  it('renders the canvas on the server without drawing', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
    expect(asked).not.toHaveBeenCalled();
    expect(thrown).toEqual([]);
  });
});
