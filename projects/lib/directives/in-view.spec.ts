import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrInView } from './in-view';

class StubObserver {
  static instances: StubObserver[] = [];
  readonly observed = new Set<Element>();
  readonly disconnect = vi.fn();
  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    StubObserver.instances.push(this);
  }
  observe = (el: Element): void => void this.observed.add(el);
  unobserve = (el: Element): void => void this.observed.delete(el);
  fire(el: Element, isIntersecting: boolean): void {
    this.callback(
      [{ target: el, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

@Component({
  imports: [WrInView],
  template: `
    @if (show()) {
      <div class="a" (wrInView)="a.push($event)" [wrInViewThreshold]="0.5"></div>
      <div class="b" (wrInView)="b.push($event)" [wrInViewThreshold]="0.5" wrInViewOnce></div>
      <div class="c" (wrInView)="c.push($event)"></div>
    }
  `,
})
class Host {
  readonly show = signal(true);
  readonly a: boolean[] = [];
  readonly b: boolean[] = [];
  readonly c: boolean[] = [];
}

describe('WrInView', () => {
  const render = async (): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };
  const el = (fixture: ReturnType<typeof TestBed.createComponent<Host>>, cls: string): Element =>
    (fixture.nativeElement as HTMLElement).querySelector(`.${cls}`)!;

  beforeEach(() => {
    StubObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('shares one observer per threshold', async () => {
    await render();
    expect(StubObserver.instances.map(o => o.options?.threshold)).toEqual([0.5, 0]);
    expect(StubObserver.instances[0].observed.size).toBe(2);
  });

  it('emits on change only, never an initial false', async () => {
    const fixture = await render();
    const [half] = StubObserver.instances;
    half.fire(el(fixture, 'a'), false);
    half.fire(el(fixture, 'a'), true);
    half.fire(el(fixture, 'a'), true);
    half.fire(el(fixture, 'a'), false);
    expect(fixture.componentInstance.a).toEqual([true, false]);
  });

  it('stops after the first entry with once', async () => {
    const fixture = await render();
    const [half] = StubObserver.instances;
    half.fire(el(fixture, 'b'), true);
    expect(fixture.componentInstance.b).toEqual([true]);
    expect(half.observed.has(el(fixture, 'b'))).toBe(false);
    expect(half.observed.has(el(fixture, 'a'))).toBe(true);
    half.fire(el(fixture, 'b'), false);
    expect(fixture.componentInstance.b).toEqual([true]);
  });

  it('disconnects a pool when its last element is destroyed', async () => {
    const fixture = await render();
    fixture.componentInstance.show.set(false);
    fixture.detectChanges();
    expect(StubObserver.instances.every(o => o.disconnect.mock.calls.length === 1)).toBe(true);
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render();
    expect(fixture.componentInstance.a).toEqual([]);
    expect(StubObserver.instances).toHaveLength(0);
  });
});
