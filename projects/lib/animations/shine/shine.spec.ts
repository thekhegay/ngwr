import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SHINE_PASS, SHINE_REST, WrShine } from './shine';

@Component({
  imports: [WrShine],
  template: `<span class="chip"
    ><span wrShine>Added in {{ version() }}</span></span
  >`,
})
class Host {
  readonly version = signal('v15.6');
}

@Component({
  imports: [WrShine],
  template: `<button type="button"><span wrShine>Go</span></button>`,
})
class FocusableHost {}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
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

/** The modifiers on the host, in order: which state the directive is in. */
const states = (el: HTMLElement): string[] =>
  Array.from(el.classList)
    .filter(name => name.startsWith('wr-shine--'))
    .map(name => name.slice('wr-shine--'.length));

/** `animationend` as the browser fires it for `name`, on `el`. jsdom has no `AnimationEvent`. */
const end = (el: HTMLElement, name: string): void => {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: name });
  el.dispatchEvent(event);
};

describe('WrShine', () => {
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
    fixture.nativeElement.querySelector<HTMLElement>('.wr-shine')!;

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  /** Into view and through the first delay: a pass is in flight. */
  const pass = (fixture: { detectChanges(): void }, el: HTMLElement): void => {
    view(fixture, true);
    end(el, SHINE_REST);
  };

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('watches for most of the host to be in view and sits still until then', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances[0].options?.threshold).toBeGreaterThanOrEqual(0.5);
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
    expect(el.className).toBe('wr-shine');
  });

  it('cycles delay, pass, pause, pass on the host animations ending, and never touches the text', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const nodes = Array.from(el.childNodes);

    view(fixture, true);
    expect(states(el)).toEqual(['first']);

    end(el, SHINE_REST);
    expect(states(el)).toEqual(['pass']);

    end(el, SHINE_PASS);
    expect(states(el)).toEqual(['rest']);

    end(el, SHINE_REST);
    expect(states(el)).toEqual(['pass']);

    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe('Added in v15.6');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });

  it('keeps a binding live inside the host', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    pass(fixture, el);

    fixture.componentInstance.version.set('v16.0');
    fixture.detectChanges();

    expect(el.textContent).toBe('Added in v16.0');
    expect(states(el)).toEqual(['pass']);
  });

  it('ignores an animation that is not its own, or not on the host', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);

    end(el, 'something-else');
    expect(states(el)).toEqual(['first']);

    end(el, SHINE_PASS);
    expect(states(el)).toEqual(['first']);

    const child = el.appendChild(document.createElement('i'));
    end(child, SHINE_REST);
    expect(states(el)).toEqual(['first']);
    child.remove();

    end(el, SHINE_REST);
    expect(states(el)).toEqual(['pass']);
  });

  it('stops when the host leaves the viewport and starts over, with the delay, when it comes back', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    pass(fixture, el);

    view(fixture, false);
    expect(el.className).toBe('wr-shine');

    end(el, SHINE_PASS);
    expect(el.className).toBe('wr-shine');

    view(fixture, true);
    expect(states(el)).toEqual(['first']);
    expect(StubIntersectionObserver.instances[0].disconnect).not.toHaveBeenCalled();
  });

  it('stops while the document is hidden and starts over when it is shown', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    pass(fixture, el);

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(el.className).toBe('wr-shine');

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(states(el)).toEqual(['first']);
  });

  it('stops when motion is reduced while it runs', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    pass(fixture, el);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(el.className).toBe('wr-shine');
  });

  it('plays a pass at once on hover or focus of the focusable ancestor while waiting, never mid-pass or when off', async () => {
    const fixture = await render(FocusableHost);
    const el = target(fixture);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button')!;

    // Off: not in view yet.
    button.dispatchEvent(new Event('pointerenter'));
    expect(el.className).toBe('wr-shine');

    // During the first delay.
    view(fixture, true);
    button.dispatchEvent(new Event('pointerenter'));
    expect(states(el)).toEqual(['pass']);

    // In flight: nothing restarts.
    button.dispatchEvent(new Event('pointerenter'));
    button.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(states(el)).toEqual(['pass']);

    // Between passes.
    end(el, SHINE_PASS);
    expect(states(el)).toEqual(['rest']);
    button.dispatchEvent(new Event('focusin', { bubbles: true }));
    expect(states(el)).toEqual(['pass']);

    end(el, SHINE_PASS);
    button.dispatchEvent(new Event('pointerenter'));
    expect(states(el)).toEqual(['pass']);
  });

  it('reads hover and focus on the host itself when nothing above it is focusable', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    view(fixture, true);
    end(el, SHINE_REST);
    end(el, SHINE_PASS);
    expect(states(el)).toEqual(['rest']);

    el.dispatchEvent(new Event('pointerenter'));

    expect(states(el)).toEqual(['pass']);
  });

  it('does nothing under reduced motion', async () => {
    const fixture = await render(Host, [platform(stub(true))]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('wr-shine');
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('wr-shine');
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render(Host);
    const el = target(fixture);

    el.dispatchEvent(new Event('pointerenter'));

    expect(el.className).toBe('wr-shine');
  });

  it('does nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render(Host);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('wr-shine');
  });

  it('stops observing, drops its listeners and clears the host on destroy', async () => {
    const fixture = await render(FocusableHost);
    const el = target(fixture);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button')!;
    const observer = StubIntersectionObserver.instances[0];
    pass(fixture, el);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(el.className).toBe('wr-shine');

    button.dispatchEvent(new Event('pointerenter'));
    end(el, SHINE_REST);
    expect(el.className).toBe('wr-shine');
  });
});
