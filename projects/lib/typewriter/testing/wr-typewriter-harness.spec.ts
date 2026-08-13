import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, PLATFORM_ID, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { WrTypewriter } from 'ngwr/typewriter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTypewriterHarness } from './wr-typewriter-harness';

@Component({
  imports: [WrTypewriter],
  template: `
    <wr-typewriter
      [text]="text()"
      [texts]="texts()"
      [typingSpeed]="10"
      [deletingSpeed]="10"
      [pauseDuration]="100"
      [loop]="loop()"
      [showCursor]="showCursor()"
      [hideCursorWhileTyping]="hideCursorWhileTyping()"
      [cursorCharacter]="cursorCharacter()"
      [cursorBlinkDuration]="cursorBlinkDuration()"
      [reverseMode]="reverseMode()"
      [textColors]="textColors()"
      (sentenceComplete)="done.push($event.text)"
    />
  `,
})
class Host {
  readonly text = signal<string | undefined>('Hello');
  readonly texts = signal<readonly string[] | undefined>(undefined);
  readonly loop = signal(true);
  readonly showCursor = signal(true);
  readonly hideCursorWhileTyping = signal(false);
  readonly cursorCharacter = signal('|');
  readonly cursorBlinkDuration = signal(0.5);
  readonly reverseMode = signal(false);
  readonly textColors = signal<readonly string[]>([]);
  readonly done: string[] = [];
}

/**
 * A machine that waits to be seen. Its own host because `startOnVisible` is read once,
 * inside `afterNextRender` — a signal flipped after the first render never reaches it.
 */
@Component({
  imports: [WrTypewriter],
  template: ` <wr-typewriter text="Hello" [typingSpeed]="10" [startOnVisible]="true" /> `,
})
class LazyHost {}

/** Two machines on one page — the only setup in which the filters mean anything. */
@Component({
  imports: [WrTypewriter],
  template: `
    <wr-typewriter text="Ship it" />
    <wr-typewriter text="Later" [showCursor]="false" />
  `,
})
class TwoHost {}

/**
 * jsdom has no `matchMedia` at all, so `WrPlatform` reports `false` for everything and
 * the reduced-motion branch is unreachable through a media query. A value provider is
 * the only way in.
 */
const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * The house `IntersectionObserver` stub — jsdom has none, and `[startOnVisible]` boots
 * one. Returns the fire callbacks so the spec can scroll the machine into view itself;
 * the harness deliberately offers no such thing.
 */
function stubIntersectionObserver(): (() => void)[] {
  const fires: (() => void)[] = [];

  class StubObserver {
    constructor(private readonly cb: IntersectionObserverCallback) {}
    observe(): void {
      fires.push(() =>
        this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      );
    }
    disconnect(): void {
      /* nothing to release in the stub */
    }
  }
  vi.stubGlobal('IntersectionObserver', StubObserver);

  return fires;
}

/**
 * Used as a consumer would: through the loader, with nothing reached into past the public
 * classes the harness documents. The exceptions are marked where they happen — the
 * component writes its caret attribute and its two inline values from one template, so
 * only a tampered DOM can ask which of them the harness reads.
 *
 * The clock belongs to the spec. `setTimeout` and `clearTimeout` are faked and nothing
 * else: the machine boots in `afterNextRender`, which is reached through `whenStable`,
 * and every harness read stabilizes the same way — faking the microtask queue deadlocks
 * both. Advancing is explicit before every read, because awaiting a harness method
 * flushes microtasks and never timers.
 */
describe('WrTypewriterHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const typewriter = (): Promise<WrTypewriterHarness> => loader.getHarness(WrTypewriterHarness);

  const hostElement = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('wr-typewriter')!;

  const mount = async (providers: Provider[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reads the fragment that has been typed so far, one character per tick', async () => {
    const machine = await typewriter();
    expect(await machine.getText()).toBe('');

    // The first tick is scheduled at `initialDelay`, which is 0 here — so advancing 10ms
    // runs the tick at 0 AND the one at 10.
    vi.advanceTimersByTime(0);
    expect(await machine.getText()).toBe('H');

    vi.advanceTimersByTime(10);
    expect(await machine.getText()).toBe('He');

    vi.advanceTimersByTime(20);
    expect(await machine.getText()).toBe('Hell');
  });

  it('keeps a fragment ending in a space exactly as it stands', async () => {
    fixture.componentInstance.text.set('a b');
    await fixture.whenStable();
    const machine = await typewriter();

    vi.advanceTimersByTime(10);

    // A trimming read cannot tell this frame from the one before it, and the pause on a
    // word boundary is a whole tick of the animation.
    expect(await machine.getText()).toBe('a ');
    vi.advanceTimersByTime(10);
    expect(await machine.getText()).toBe('a b');
  });

  it('deletes back to empty and types the next string', async () => {
    fixture.componentInstance.text.set(undefined);
    fixture.componentInstance.texts.set(['ab', 'cd']);
    await fixture.whenStable();
    const machine = await typewriter();

    vi.advanceTimersByTime(10 * 2);
    expect(await machine.getText()).toBe('ab');

    // One tick to notice the sentence is done, then the pause, then one deletion per
    // tick — the empty string in the middle is a real frame, not a missing read.
    vi.advanceTimersByTime(100);
    expect(await machine.getText()).toBe('a');
    vi.advanceTimersByTime(10);
    expect(await machine.getText()).toBe('');

    vi.advanceTimersByTime(10 + 100);
    expect(await machine.getText()).toBe('c');
    vi.advanceTimersByTime(10);
    expect(await machine.getText()).toBe('cd');
  });

  it('settles and stays settled when it is not looping', async () => {
    fixture.componentInstance.loop.set(false);
    await fixture.whenStable();
    const machine = await typewriter();

    vi.advanceTimersByTime(10 * 5);
    expect(await machine.getText()).toBe('Hello');

    vi.advanceTimersByTime(10_000);

    // Nothing in the DOM separates "stopped for good" from "pausing between sentences",
    // which is why the harness has no isComplete() — the settled string is the assertion,
    // and the output is the other half.
    expect(await machine.getText()).toBe('Hello');
    expect(fixture.componentInstance.done).toEqual(['Hello']);
  });

  it('reverses by code point, so an emoji stays one glyph', async () => {
    fixture.componentInstance.text.set('ab🚀');
    fixture.componentInstance.reverseMode.set(true);
    await fixture.whenStable();
    const machine = await typewriter();

    vi.advanceTimersByTime(10 * 3);

    // `split('')` reverses UTF-16 units, which types two lone surrogates instead of the
    // rocket — same character count read naively, two replacement glyphs on screen.
    expect(await machine.getText()).toBe('🚀ba');
    expect([...(await machine.getText())].length).toBe(3);
  });

  it('shows the whole sentence at once for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    const machine = await typewriter();

    vi.advanceTimersByTime(1);

    expect(await machine.getText()).toBe('Hello');
    expect(fixture.componentInstance.done).toEqual(['Hello']);
  });

  it('reads the whole first sentence out of prerendered HTML', async () => {
    // No animation on the server, and no timer is ever created — an empty span would
    // ship as the page's visible text.
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(await (await typewriter()).getText()).toBe('Hello');
  });

  it('keeps the caret out of the accessibility tree, and reads its glyph', async () => {
    const machine = await typewriter();

    expect([await machine.hasCursor(), await machine.isCursorDecorative()]).toEqual([true, true]);
    expect(await machine.getCursorCharacter()).toBe('|');

    fixture.componentInstance.cursorCharacter.set('▎');
    await fixture.whenStable();

    expect(await machine.getCursorCharacter()).toBe('▎');
  });

  it('reports no caret at all rather than an empty one', async () => {
    fixture.componentInstance.showCursor.set(false);
    await fixture.whenStable();
    const machine = await typewriter();

    // `null`, not `''`: the element being gone and the element rendering nothing are
    // different regressions, and only one of them is what `showCursor` asks for.
    expect([await machine.hasCursor(), await machine.getCursorCharacter()]).toEqual([false, null]);

    await expect(machine.isCursorDecorative()).rejects.toThrow(/has no cursor element/);
  });

  it('takes the caret away while it types when asked to', async () => {
    fixture.componentInstance.hideCursorWhileTyping.set(true);
    await fixture.whenStable();
    const machine = await typewriter();
    expect(await machine.hasCursor()).toBe(true);

    vi.advanceTimersByTime(10);

    // The caret vanishing is the only DOM evidence the machine considers itself
    // mid-phase — and it only exists under this input, which is why the harness offers no
    // isTyping().
    expect(await machine.hasCursor()).toBe(false);
  });

  it('stops calling the caret decorative once the attribute goes', async () => {
    const machine = await typewriter();
    hostElement().querySelector('.wr-typewriter__cursor')!.removeAttribute('aria-hidden');

    // The attribute is static in the template, so only a tampered DOM can ask whether the
    // harness reads it. It has to: without it every phrase is announced as "Hello pipe",
    // and nothing else on the page changes.
    expect([await machine.hasCursor(), await machine.isCursorDecorative()]).toEqual([true, false]);
  });

  it('reads the blink duration the host writes inline', async () => {
    const machine = await typewriter();
    expect(await machine.getCursorBlinkDuration()).toBe(0.5);

    fixture.componentInstance.cursorBlinkDuration.set(0.25);
    await fixture.whenStable();

    // The blink is a keyframe from a stylesheet no unit test loads, so this property is
    // the whole of the input's reach into it.
    expect(await machine.getCursorBlinkDuration()).toBe(0.25);
  });

  it('refuses to invent a blink duration out of a value that is not one', async () => {
    const machine = await typewriter();
    // A garbled value rather than a removed one: jsdom's computed style never lets go of
    // a custom property once it has been read, so `style.removeProperty` — and rewriting
    // the whole attribute — both leave `0.5s` answering from the cache. Writing over it
    // reaches the same branch, and the raw string is what the message has to name.
    hostElement().style.setProperty('--wr-typewriter-cursor-blink', 'fast');

    // The SCSS `0.5s` behind this property is never applied in a test, so a
    // `parseFloat` fallback would be indistinguishable from the binding working.
    await expect(machine.getCursorBlinkDuration()).rejects.toThrow(/reads "fast", which is not a number of seconds/);
  });

  it('reads `inherit` as a value, and cycles a colour per sentence', async () => {
    const machine = await typewriter();
    expect(await machine.getColor()).toBe('inherit');

    fixture.componentInstance.text.set(undefined);
    fixture.componentInstance.texts.set(['a', 'b']);
    fixture.componentInstance.textColors.set(['red', 'blue']);
    await fixture.whenStable();
    expect(await machine.getColor()).toBe('red');

    // Type, pause, delete, pause — the colour index follows the SENTENCE index, so it
    // moves once per swap and not once per character.
    vi.advanceTimersByTime(10 + 100 + 10 + 100);

    expect(await machine.getColor()).toBe('blue');
  });

  it('refuses to guess a colour when the host carries none', async () => {
    const machine = await typewriter();
    hostElement().removeAttribute('style');

    // Whatever the page inherits is not the component's answer, and returning `''` here
    // would pass for a machine whose colour binding had been deleted.
    await expect(machine.getColor()).rejects.toThrow(/carries no inline color/);
  });
});

describe('WrTypewriterHarness on a machine that waits to be seen', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LazyHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let fires: (() => void)[];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fires = stubIntersectionObserver();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(LazyHost);
    fixture.detectChanges();
    await fixture.whenStable();

    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the empty fragment until the viewport reaches it', async () => {
    const machine = await loader.getHarness(WrTypewriterHarness);

    vi.advanceTimersByTime(1_000);

    // The empty string is a state, not a missing read — and a harness method that
    // reported "not visible yet" would be reporting this spec's own stub back to it.
    expect(await machine.getText()).toBe('');

    fires.forEach(fire => fire());
    vi.advanceTimersByTime(0);

    expect(await machine.getText()).toBe('H');
  });
});

/**
 * Reduced motion for the filter host on purpose: each machine settles on its whole
 * sentence at the first tick, which is the only frame in which addressing one of them by
 * its text is stable at all.
 */
describe('WrTypewriterHarness filters', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    await fixture.whenStable();
    vi.advanceTimersByTime(1);

    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('matches on what has been typed so far', async () => {
    const shipping = await loader.getHarness(WrTypewriterHarness.with({ text: 'Ship it' }));
    expect(await shipping.getCursorCharacter()).toBe('|');

    expect(await loader.getHarnessOrNull(WrTypewriterHarness.with({ text: /^Later$/ }))).not.toBeNull();

    // A prefix is not a match, which is exactly why the filter is documented as reading a
    // frame: 'Ship' is a real state of this machine, just not the one it is resting in.
    expect(await loader.getHarnessOrNull(WrTypewriterHarness.with({ text: 'Ship' }))).toBeNull();
  });

  it('matches on whether a caret is showing', async () => {
    expect(await (await loader.getHarness(WrTypewriterHarness.with({ hasCursor: false }))).getText()).toBe('Later');
    expect(await (await loader.getHarness(WrTypewriterHarness.with({ hasCursor: true }))).getText()).toBe('Ship it');
  });
});
