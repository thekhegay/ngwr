import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrGlitch } from './glitch';

@Component({
  imports: [WrGlitch],
  template: `<h2 wrGlitch>{{ title() }}</h2>`,
})
class Host {
  readonly title = signal('404');
}

/** The host is a box-less wrapper and the text sits in a child the host does not own, as on the 404 page. */
@Component({
  imports: [WrGlitch],
  template: `<div [wrGlitch]="selector()" style="display: contents">
    <p class="desc">Nothing here</p>
    <h2 class="title">404</h2>
    <button type="button">Go home</button>
  </div>`,
})
class TargetHost {
  readonly selector = signal<string | null>('.title');
}

@Component({
  imports: [WrGlitch],
  template: `<a href="#"><span wrGlitch>Go</span></a>`,
})
class FocusableHost {}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const COPY = '.wr-glitch__copy';

const live = (el: HTMLElement): boolean => el.classList.contains('wr-glitch--live');

const copies = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(COPY));

const enter = (el: HTMLElement): void => {
  el.dispatchEvent(new Event('pointerenter'));
};
const leave = (el: HTMLElement): void => {
  el.dispatchEvent(new Event('pointerleave'));
};
const focus = (el: HTMLElement): void => {
  el.dispatchEvent(new Event('focusin', { bubbles: true }));
};
const blur = (el: HTMLElement): void => {
  el.dispatchEvent(new Event('focusout', { bubbles: true }));
};

/**
 * The flash budget lives in the stylesheet: WCAG 2.3.1 allows three flashes
 * in any second, and the sheet keeps to at most two by cutting the line into
 * bands no copy lights twice in a cycle, with the cycle at a second or more.
 * Read from the sheet, so a redesign of the keyframes has to keep the promise.
 */
describe('the glitch stylesheet', () => {
  const sheet = readFileSync(join(process.cwd(), 'projects/lib/animations/glitch/styles/_index.scss'), 'utf8');

  /** The `[top, bottom]` bands, in %, of one copy's keyframes, in keyframe order. */
  const bands = (name: string): [number, number][] => {
    const body = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(sheet)![1];
    return [...body.matchAll(/clip-path: inset\((\d+)% 0 (\d+)% 0\)/g)].map(m => [Number(m[1]), 100 - Number(m[2])]);
  };

  it('loops at a second or more, in held steps', () => {
    const cycle = /--wr-glitch-cycle: ([\d.]+)s;/.exec(sheet)!;
    expect(Number(cycle[1])).toBeGreaterThanOrEqual(1);
    expect(sheet.match(/steps\(1, end\) infinite/g)).toHaveLength(3);
  });

  it('lights no band of the line twice in a cycle, by either copy', () => {
    const all = [...bands('wr-glitch-slice-a'), ...bands('wr-glitch-slice-b')];
    expect(all).toHaveLength(12);
    for (const [top, bottom] of all) {
      expect(bottom).toBeGreaterThan(top);
      expect(bottom - top).toBeLessThanOrEqual(10);
    }
    const sorted = [...all].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i][0]).toBeGreaterThanOrEqual(sorted[i - 1][1]);
  });

  it('moves a slice to a different place at every step', () => {
    for (const name of ['wr-glitch-slice-a', 'wr-glitch-slice-b']) {
      const list = bands(name);
      expect(list).toHaveLength(6);
      for (let i = 1; i < list.length; i++) expect(list[i][0]).not.toBe(list[i - 1][0]);
    }
  });
});

describe('WrGlitch', () => {
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

  const target = (fixture: { nativeElement: HTMLElement }, selector = 'h2'): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>(selector)!;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('marks the target and sits still on its own, however long', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.classList.contains('wr-glitch')).toBe(true);
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();
    expect(live(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
  });

  it('plays while the pointer is over it and stops clean when it leaves', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const text = el.firstChild!;
    expect(text.nodeType).toBe(Node.TEXT_NODE);

    enter(el);
    fixture.detectChanges();
    expect(live(el)).toBe(true);
    const [a, b] = copies(el);
    expect(a.textContent).toBe('404');
    expect(b.textContent).toBe('404');
    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(b.getAttribute('aria-hidden')).toBe('true');
    expect(a.classList.contains('wr-glitch__copy--a')).toBe(true);
    expect(b.classList.contains('wr-glitch__copy--b')).toBe(true);
    // The accessible text is the one node, read once, where it was.
    expect(el.firstChild).toBe(text);
    expect(Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE)).toEqual([text]);
    expect(el.getAttribute('aria-hidden')).toBeNull();

    // Still on after any length of time: the loop is the stylesheet's.
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();
    expect(live(el)).toBe(true);
    expect(copies(el)).toHaveLength(2);

    leave(el);
    fixture.detectChanges();
    expect(live(el)).toBe(false);
    expect(Array.from(el.childNodes)).toEqual([text]);
    expect(el.getAttribute('style')).toBeFalsy();
  });

  it('copies the current text each time it starts', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    enter(el);
    fixture.detectChanges();
    expect(copies(el)[0].textContent).toBe('404');
    leave(el);
    fixture.detectChanges();

    fixture.componentInstance.title.set('410');
    fixture.detectChanges();
    expect(el.firstChild!.textContent).toBe('410');

    enter(el);
    fixture.detectChanges();
    expect(copies(el)[0].textContent).toBe('410');
  });

  it('plays while focus is in the closest focusable ancestor', async () => {
    const fixture = await render(FocusableHost);
    const el = target(fixture, 'span');
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;

    focus(link);
    fixture.detectChanges();
    expect(live(el)).toBe(true);
    expect(copies(el)).toHaveLength(2);

    blur(link);
    fixture.detectChanges();
    expect(live(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);

    // The pointer is read on the link too.
    enter(link);
    fixture.detectChanges();
    expect(live(el)).toBe(true);
    leave(link);
    fixture.detectChanges();
    expect(live(el)).toBe(false);
  });

  it('stops while the document is hidden and picks up again when it is shown with the pointer still over it', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    enter(el);
    fixture.detectChanges();
    expect(live(el)).toBe(true);

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(live(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(live(el)).toBe(true);
    expect(copies(el)).toHaveLength(2);
  });

  it('stops when motion is reduced while it plays', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    enter(el);
    fixture.detectChanges();
    expect(live(el)).toBe(true);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(live(el)).toBe(false);
    expect(copies(el)).toHaveLength(0);
  });

  it('glitches the descendant a selector names and listens on it, not on the host', async () => {
    const fixture = await render(TargetHost);
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('div')!;
    const title = target(fixture, '.title');
    const desc = target(fixture, '.desc');

    expect(title.classList.contains('wr-glitch')).toBe(true);
    expect(host.classList.contains('wr-glitch')).toBe(false);
    expect(desc.classList.contains('wr-glitch')).toBe(false);

    // A focus on the host's button is not about the heading; a pointer on the heading is.
    focus(host.querySelector('button')!);
    fixture.detectChanges();
    expect(live(title)).toBe(false);

    enter(title);
    fixture.detectChanges();
    expect(live(title)).toBe(true);
    expect(copies(title)).toHaveLength(2);
    expect(copies(title)[0].textContent).toBe('404');
    expect(copies(desc)).toHaveLength(0);
    expect(live(host)).toBe(false);
  });

  it('does nothing when the selector matches nothing', async () => {
    TestBed.configureTestingModule({ providers: [platform(stub())] as never[] });
    const fixture = TestBed.createComponent(TargetHost);
    fixture.componentInstance.selector.set('.missing');
    fixture.detectChanges();
    await fixture.whenStable();
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('div')!;

    expect(host.querySelector('.wr-glitch')).toBeNull();
    enter(host);
    enter(host.querySelector('.title')!);
    fixture.detectChanges();
    expect(host.querySelectorAll(COPY)).toHaveLength(0);
  });

  it('does nothing under reduced motion', async () => {
    const fixture = await render(Host, [platform(stub(true))]);
    const el = target(fixture);

    expect(el.className).toBe('');
    enter(el);
    fixture.detectChanges();
    expect(copies(el)).toHaveLength(0);
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(el.className).toBe('');
    enter(el);
    fixture.detectChanges();
    expect(copies(el)).toHaveLength(0);
  });

  it('does nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.className).toBe('');
    enter(el);
    fixture.detectChanges();
    expect(copies(el)).toHaveLength(0);
  });

  it('drops its listeners and restores the target on destroy', async () => {
    const fixture = await render(TargetHost);
    const title = target(fixture, '.title');
    const text = title.firstChild!;
    enter(title);
    fixture.detectChanges();
    expect(copies(title)).toHaveLength(2);

    fixture.destroy();

    expect(title.className).toBe('title');
    expect(title.getAttribute('style')).toBeFalsy();
    expect(Array.from(title.childNodes)).toEqual([text]);

    enter(title);
    expect(title.className).toBe('title');
    expect(copies(title)).toHaveLength(0);
  });
});
