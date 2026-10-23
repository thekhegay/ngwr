import {
  type ApplicationRef,
  Component,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  ɵsetDocument,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type BootstrapContext, bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { ɵENABLE_DOM_EMULATION, provideServerRendering, renderApplication } from '@angular/platform-server';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSplitText } from './split-text';
import type { WrSplitTextUnit } from './types';

@Component({
  imports: [WrSplitText],
  template: `
    <wr-split-text
      [text]="text()"
      [splitType]="splitType()"
      [textAlign]="textAlign()"
      (animationComplete)="done = done + 1"
    />
  `,
})
class Host {
  readonly text = signal('Hi there');
  readonly splitType = signal<WrSplitTextUnit>('chars');
  readonly textAlign = signal<'left' | 'center' | 'right' | 'justify'>('center');
  done = 0;
}

@Component({
  imports: [WrSplitText],
  template: `@if (show()) {
    <wr-split-text text="Hi there" />
  }`,
})
class ToggleHost {
  readonly show = signal(true);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * Under reduced motion the tween is skipped entirely, which is what makes the
 * component testable here at all — jsdom has neither `IntersectionObserver` (stubbed
 * below) nor the Web Animations API. What is pinned is the split itself, and the
 * accessible layer: a per-character span list read letter by letter is the failure
 * mode this component would otherwise ship.
 */
describe('WrSplitText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let observed: (() => void)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): string => root().querySelector('.wr-split-text__sr-only')!.textContent;
  const pieces = (): string[] => [...root().querySelectorAll('.wr-split-text__piece')].map(el => el.textContent);
  const spaces = (): number => root().querySelectorAll('.wr-split-text__space').length;

  const mount = async (providers: unknown[] = []): Promise<void> => {
    observed = [];
    class StubObserver {
      constructor(private readonly cb: IntersectionObserverCallback) {}
      observe(): void {
        observed.push(() =>
          this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
        );
      }
      disconnect(): void {
        /* nothing to release in the stub */
      }
    }
    vi.stubGlobal('IntersectionObserver', StubObserver);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Scroll it into view, the way the observer would. */
  const enterViewport = async (): Promise<void> => {
    observed.forEach(fire => fire());
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount([{ provide: WrPlatform, useValue: reducedMotion }]));

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('orders the pieces by their own text, not by the page direction', () => {
    // Each piece is an inline-block, which the bidi algorithm reads as a neutral: under
    // the page's direction 'Hello' read 'olleH' on an RTL page.
    expect(root().querySelector('wr-split-text')!.getAttribute('dir')).toBe('auto');
  });

  it('carries the whole string once, with the pieces out of the tree', () => {
    expect(readable()).toBe('Hi there');
    for (const el of root().querySelectorAll('.wr-split-text__piece')) {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('splits into one piece per character, keeping the spaces separate', () => {
    expect(pieces()).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);
    expect(spaces()).toBe(1);
  });

  it('splits into words when asked', () => {
    fixture.componentInstance.splitType.set('words');
    fixture.detectChanges();

    expect(pieces()).toEqual(['Hi', 'there']);
  });

  it('keeps a surrogate pair in one piece', () => {
    fixture.componentInstance.text.set('a🚀');
    fixture.detectChanges();

    expect(pieces()).toEqual(['a', '🚀']);
  });

  it('reports completion as soon as it is seen, for someone who asked for less motion', async () => {
    expect(fixture.componentInstance.done).toBe(0);
    await enterViewport();

    expect(fixture.componentInstance.done).toBe(1);
  });

  it('reports completion once, however often it is seen', async () => {
    await enterViewport();
    await enterViewport();

    expect(fixture.componentInstance.done).toBe(1);
  });

  it('waits to be seen before doing anything', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(fixture.componentInstance.done).toBe(0);
    expect(observed.length).toBeGreaterThan(0);
  });

  it('follows the alignment it was given', () => {
    expect(root().querySelector<HTMLElement>('wr-split-text')!.style.textAlign).toBe('center');

    fixture.componentInstance.textAlign.set('right');
    fixture.detectChanges();
    expect(root().querySelector<HTMLElement>('wr-split-text')!.style.textAlign).toBe('right');
  });

  it('renders the text plainly on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(readable()).toBe('Hi there');
    expect(pieces().join('')).toBe('Hithere');
    expect(observed).toEqual([]);
  });

  /**
   * The observer is built inside a `document.fonts.ready` continuation, and jsdom
   * has no `document.fonts` at all — so `ready` collapses to `Promise.resolve()`
   * and the window these two are about never opens on its own. Stubbing it open is
   * the only way a unit suite reaches the ordering between teardown and the
   * continuation; the second test is here so the first cannot pass on a recorder
   * that records nothing.
   */
  describe('destroyed while the fonts are still loading', () => {
    let toggle: ReturnType<typeof TestBed.createComponent<ToggleHost>>;
    let built: { observing: boolean; disconnected: boolean }[];
    let originalFonts: PropertyDescriptor | undefined;

    /** Mounts with the fonts pending, and hands back the resolver for them. */
    const mountLoading = async (): Promise<() => void> => {
      built = [];
      let settle!: () => void;
      const ready = new Promise<void>(resolve => {
        settle = resolve;
      });
      // Own property only — jsdom's `fonts`, if it has one, lives on the
      // prototype, so deleting ours puts that back.
      originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
      Object.defineProperty(document, 'fonts', { value: { status: 'loading', ready }, configurable: true });

      const records = built;
      class RecordingObserver {
        private readonly record = { observing: false, disconnected: false };
        constructor() {
          records.push(this.record);
        }
        observe(): void {
          this.record.observing = true;
        }
        disconnect(): void {
          this.record.disconnected = true;
        }
      }
      vi.stubGlobal('IntersectionObserver', RecordingObserver);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
      toggle = TestBed.createComponent(ToggleHost);
      toggle.detectChanges();
      await toggle.whenStable();
      return settle;
    };

    afterEach(() => {
      toggle.destroy();
      if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
      else Reflect.deleteProperty(document, 'fonts');
    });

    it('starts no observer once it has been detached', async () => {
      const settle = await mountLoading();
      const host = (toggle.nativeElement as HTMLElement).querySelector('wr-split-text')!;
      expect(built).toEqual([]);

      toggle.componentInstance.show.set(false);
      await toggle.whenStable();
      expect(host.isConnected).toBe(false);

      settle();
      await toggle.whenStable();
      await Promise.resolve();

      // The destroy hook ran while `observer` was still null, so anything the
      // continuation started afterwards had nothing left to disconnect it.
      expect(built).toEqual([]);
    });

    it('starts one once the fonts settle while it is still on the page', async () => {
      const settle = await mountLoading();
      expect(built).toEqual([]);

      settle();
      await toggle.whenStable();
      await Promise.resolve();

      expect(built.some(o => o.observing)).toBe(true);
    });
  });

  /**
   * jsdom has no Web Animations API, so `animate` is stubbed and each tween's
   * `onfinish` is fired by hand — which is what reaches the ordering that matters:
   * a tween still in flight when the component goes away. The second spec is here
   * so the first cannot pass on a stub that never finishes anything.
   */
  describe('with motion', () => {
    let animateBefore: PropertyDescriptor | undefined;
    let tweens: Animation[];

    const finishAll = (): void => {
      for (const tween of tweens) tween.onfinish?.call(tween, new Event('finish') as AnimationPlaybackEvent);
    };

    beforeEach(async () => {
      fixture.destroy();
      tweens = [];
      animateBefore = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
      Element.prototype.animate = function () {
        const tween = { cancel: () => undefined, onfinish: null } as unknown as Animation;
        tweens.push(tween);
        return tween;
      };
      await mount([
        { provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: signal(false).asReadonly() } },
      ]);
      await enterViewport();
    });

    afterEach(() => {
      if (animateBefore) Object.defineProperty(Element.prototype, 'animate', animateBefore);
      else delete (Element.prototype as Partial<Element>).animate;
    });

    it('reports completion once the last piece lands', () => {
      expect(tweens.length).toBe(pieces().length);
      expect(fixture.componentInstance.done).toBe(0);

      finishAll();
      expect(fixture.componentInstance.done).toBe(1);
    });

    it('stays silent when the last piece lands after it has been destroyed', () => {
      // `console.warn`, which is the channel Angular reports NG0953 on.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      fixture.destroy();

      finishAll();
      expect(warn.mock.calls.map(args => args.map(String).join(' ')).filter(m => m.includes('NG0953'))).toEqual([]);
    });
  });
});

@Component({
  selector: 'wr-test-ssr-split-root',
  imports: [WrSplitText],
  template: `<wr-split-text [text]="text()" (animationComplete)="done = done + 1" />`,
})
class SsrRoot {
  readonly text = signal('Hi there');
  done = 0;
}

/**
 * A prerendered page shows the text at rest long before the bundle boots, and
 * hydration keeps those very nodes. Playing the entrance there blanks text the
 * visitor has been reading and fades it back in. So this renders the root for
 * real with `@angular/platform-server`, hands the HTML to jsdom, and hydrates
 * it with `provideClientHydration()` — the path a prerendered page takes, with
 * no stand-in for Angular's own hydration — then reads whether a tween started.
 *
 * The other two cases are the half that must keep animating: a host Angular
 * creates on the client, and hydrated text whose `text` changes later.
 */
describe('WrSplitText over server-rendered markup', () => {
  let tweens: number;
  let observers: { fire: () => void; connected: boolean }[];
  let app: ApplicationRef | null;
  let animateBefore: PropertyDescriptor | undefined;

  const pieces = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-split-text__piece')];

  /**
   * Renders on a document of its own, with platform-server's DOM emulation off.
   * The builder runs vitest non-isolated, so every spec file in this worker shares
   * one global scope, and the emulation replaces `Event`, `Node` and the rest with
   * domino's for every file that runs after this one — a harness dispatching a
   * jsdom event then fails three files away. The server platform also points
   * core's document reference at the one it rendered on, which is handed back.
   */
  const serverRender = async (): Promise<string> => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = '<wr-test-ssr-split-root></wr-test-ssr-split-root>';
    try {
      const html = await renderApplication(
        (context: BootstrapContext) =>
          bootstrapApplication(
            SsrRoot,
            { providers: [provideServerRendering(), provideZonelessChangeDetection(), provideClientHydration()] },
            context
          ),
        { document: doc, platformProviders: [{ provide: ɵENABLE_DOM_EMULATION, useValue: false }] }
      );
      return /<body>([\s\S]*)<\/body>/.exec(html)![1];
    } finally {
      ɵsetDocument(document);
    }
  };

  /** Bootstraps over `body`, or over whatever the page already holds when it is `null`. */
  const boot = async (body: string | null, hydrate: boolean): Promise<SsrRoot> => {
    if (body !== null) document.body.innerHTML = body;
    app = await bootstrapApplication(SsrRoot, {
      providers: [provideZonelessChangeDetection(), ...(hydrate ? [provideClientHydration()] : [])],
    });
    await app.whenStable();
    return app.components[0].instance as SsrRoot;
  };

  /** Scroll it into view: every observer still connected reports an intersection. */
  const enterViewport = async (): Promise<void> => {
    // The observer is built in a fonts-ready continuation, a microtask past render.
    await new Promise(resolve => setTimeout(resolve));
    for (const observer of observers.filter(o => o.connected)) observer.fire();
    await app!.whenStable();
  };

  beforeEach(() => {
    tweens = 0;
    observers = [];
    app = null;
    const records = observers;
    class StubObserver {
      private readonly record = { fire: (): void => undefined, connected: false };
      constructor(cb: IntersectionObserverCallback) {
        this.record.fire = () =>
          cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        records.push(this.record);
      }
      observe(): void {
        this.record.connected = true;
      }
      disconnect(): void {
        this.record.connected = false;
      }
    }
    vi.stubGlobal('IntersectionObserver', StubObserver);
    animateBefore = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    Element.prototype.animate = function () {
      tweens++;
      return { cancel: () => undefined, onfinish: null } as unknown as Animation;
    };
    // Development-mode and hydration-stats lines, printed by every bootstrap.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    app?.destroy();
    document.body.innerHTML = '';
    if (animateBefore) Object.defineProperty(Element.prototype, 'animate', animateBefore);
    else delete (Element.prototype as Partial<Element>).animate;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('leaves hydrated text where the server painted it', async () => {
    document.body.innerHTML = await serverRender();
    const painted = pieces()[0];
    const root = await boot(null, true);
    // Hydration, not a re-render: the server's nodes are the ones on the page.
    expect(pieces()[0]).toBe(painted);

    await enterViewport();

    expect(tweens).toBe(0);
    expect(pieces().map(piece => piece.style.opacity)).toEqual(pieces().map(() => ''));
    // Completion is still reported, as it is under reduced motion.
    expect(root.done).toBe(1);
  });

  it('animates a host created on the client', async () => {
    await boot('<wr-test-ssr-split-root></wr-test-ssr-split-root>', false);

    await enterViewport();

    expect(tweens).toBe(pieces().length);
    expect(tweens).toBeGreaterThan(0);
  });

  it('animates hydrated text once the text changes', async () => {
    const root = await boot(await serverRender(), true);
    await enterViewport();
    expect(tweens).toBe(0);

    root.text.set('Hello');
    await app!.whenStable();
    await enterViewport();

    expect(tweens).toBe(5);
  });
});
