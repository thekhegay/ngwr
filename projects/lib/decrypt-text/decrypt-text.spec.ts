import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDecryptText } from './decrypt-text';
import type { WrDecryptTextAnimateOn, WrDecryptTextClickMode, WrDecryptTextRevealDirection } from './interfaces';

@Component({
  imports: [WrDecryptText],
  template: `
    <wr-decrypt-text
      [text]="text()"
      [speed]="10"
      [sequential]="sequential()"
      [revealDirection]="revealDirection()"
      [animateOn]="animateOn()"
      [clickMode]="clickMode()"
      [useOriginalCharsOnly]="useOriginalCharsOnly()"
      [characters]="characters()"
    />
  `,
})
class Host {
  readonly text = signal('HELLO');
  readonly sequential = signal(false);
  readonly revealDirection = signal<WrDecryptTextRevealDirection>('start');
  readonly animateOn = signal<WrDecryptTextAnimateOn>('hover');
  readonly clickMode = signal<WrDecryptTextClickMode>('once');
  readonly useOriginalCharsOnly = signal(false);
  readonly characters = signal('XY');
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * Two things make this testable without a browser. The scramble is the only random
 * part, and `Math.random` is stubbed, so every frame is exact. And the readable
 * text is NOT the animated markup — the scrambled glyphs are `aria-hidden` and a
 * screen-reader-only span carries the real string — which is also the contract most
 * worth pinning, since it is the half nobody looks at.
 */
describe('WrDecryptText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-decrypt-text')!;
  const readable = (): string => root().querySelector('.wr-decrypt-text__sr-only')!.textContent;
  const shown = (): string => [...root().querySelectorAll('.wr-decrypt-text__char')].map(el => el.textContent).join('');
  const encryptedCount = (): number => root().querySelectorAll('.wr-decrypt-text__char--encrypted').length;

  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    // Always the first glyph in the pool, so a scramble is a known string.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('carries the real text for a screen reader, whatever is on screen', async () => {
    await mount();
    expect(readable()).toBe('HELLO');
    expect(root().querySelector('.wr-decrypt-text__sr-only')!.nextElementSibling!.getAttribute('aria-hidden')).toBe(
      'true'
    );
  });

  it('shows plain text until something triggers it', async () => {
    await mount();

    expect(shown()).toBe('HELLO');
    expect(encryptedCount()).toBe(0);
  });

  it('scrambles on hover and restores on leave', async () => {
    await mount();
    host().dispatchEvent(new Event('mouseenter'));
    advance(10);

    expect(shown()).toBe('XXXXX');
    expect(encryptedCount()).toBe(5);
    expect(readable()).toBe('HELLO');

    host().dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(shown()).toBe('HELLO');
    expect(encryptedCount()).toBe(0);
  });

  it('reveals one character per tick from the start, in order', async () => {
    await mount();
    fixture.componentInstance.sequential.set(true);
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));

    advance(10);
    expect(shown()).toBe('HXXXX');
    advance(10);
    expect(shown()).toBe('HEXXX');
    advance(30);
    expect(shown()).toBe('HELLO');
  });

  it('reveals from the end when asked', async () => {
    await mount();
    fixture.componentInstance.sequential.set(true);
    fixture.componentInstance.revealDirection.set('end');
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));

    advance(10);
    expect(shown()).toBe('XXXXO');
  });

  it('scrambles with the glyphs of the text itself when asked', async () => {
    await mount();
    fixture.componentInstance.useOriginalCharsOnly.set(true);
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));
    advance(10);

    // The pool is the distinct characters of HELLO, and `random() = 0` picks the
    // first — so the scramble is exactly 'HHHHH'. Asserting instead that every
    // glyph is one of 'HELO' is vacuous here: the text's own glyphs ARE the
    // alphabet being checked, so the untouched 'HELLO' satisfies it just as well,
    // and a component that ignored the hover entirely passed.
    expect(shown()).toBe('HHHHH');
    expect(encryptedCount()).toBe(5);
  });

  it('keeps a surrogate pair whole, and reveals the character that is really there', async () => {
    // `split('')` put half a surrogate in the scramble pool, and reading a
    // revealed character back as `txt[i]` mixed UTF-16 indices with code-point
    // ones — so everything after an emoji revealed as the wrong glyph.
    await mount();
    fixture.componentInstance.text.set('a🚀b');
    fixture.componentInstance.sequential.set(true);
    fixture.componentInstance.useOriginalCharsOnly.set(true);
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));

    advance(10);
    expect([...shown()][0]).toBe('a');
    advance(10);
    expect([...shown()][1]).toBe('🚀');
    advance(10);
    expect(shown()).toBe('a🚀b');

    // One tick per CHARACTER, and the interval stops on the tick after the last
    // one. Counting UTF-16 units would buy the rocket a second tick it has no
    // character for.
    advance(10);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('takes a custom alphabet by character, not by code unit', async () => {
    // Same bug, other pool: a caller passing emoji as scramble glyphs got lone
    // surrogates back.
    await mount();
    fixture.componentInstance.characters.set('🚀X');
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));

    for (const value of [0, 0.4, 0.6, 0.99]) {
      vi.mocked(Math.random).mockReturnValue(value);
      advance(10);
      expect([...shown()].length, `random=${value}`).toBe(5);
      expect(/[\uD800-\uDFFF]/.test(shown().replaceAll('🚀', '')), `random=${value}`).toBe(false);
    }
  });

  it('never scrambles half of a surrogate pair, whatever it picks', async () => {
    // `split('')` put `\uD83D` and `\uDE80` in the pool as separate entries, so
    // any pick landing on one rendered a replacement glyph. Sweeping `random`
    // across the pool is what makes that visible — a single fixed value only ever
    // exercises one entry.
    await mount();
    fixture.componentInstance.text.set('a🚀b');
    fixture.componentInstance.useOriginalCharsOnly.set(true);
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));

    for (const value of [0, 0.2, 0.34, 0.5, 0.67, 0.8, 0.99]) {
      vi.mocked(Math.random).mockReturnValue(value);
      advance(10);
      expect([...shown()].length, `random=${value}`).toBe(3);
      for (const ch of shown()) {
        expect(/[\uD800-\uDFFF]/.test(ch) && [...ch].length === 1 && ch.length === 1, `random=${value}`).toBe(false);
      }
    }
  });

  it('decrypts once on click and stays put', async () => {
    await mount();
    fixture.componentInstance.animateOn.set('click');
    fixture.detectChanges();
    expect(encryptedCount()).toBe(5);

    host().click();
    advance(200);
    expect(shown()).toBe('HELLO');

    host().click();
    advance(200);
    expect(shown()).toBe('HELLO');
  });

  it('flips back and forth in toggle mode', async () => {
    await mount();
    fixture.componentInstance.animateOn.set('click');
    fixture.componentInstance.clickMode.set('toggle');
    fixture.detectChanges();

    host().click();
    advance(200);
    expect(shown()).toBe('HELLO');

    host().click();
    advance(10);
    expect(shown()).not.toBe('HELLO');
  });

  it('ignores a hover in click mode, and a click in hover mode', async () => {
    await mount();
    fixture.componentInstance.animateOn.set('click');
    fixture.detectChanges();
    host().dispatchEvent(new Event('mouseenter'));
    advance(50);
    expect(shown()).not.toBe('HELLO');

    fixture.componentInstance.animateOn.set('hover');
    fixture.detectChanges();
    host().click();
    advance(50);
    expect(shown()).toBe('HELLO');
  });

  it('shows the text outright for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    host().dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    expect(shown()).toBe('HELLO');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves click mode plain at rest under reduced motion', async () => {
    // Click mode rests on the SCRAMBLE, and that path never reaches the
    // reduced-motion short-circuit in `startInterval` — so this used to be the one
    // way to end up permanently unreadable for someone who asked for less motion,
    // with no pointer-free way back.
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    fixture.componentInstance.animateOn.set('click');
    fixture.detectChanges();

    expect(shown()).toBe('HELLO');
    expect(encryptedCount()).toBe(0);
  });

  it('prerenders the plain text on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(shown()).toBe('HELLO');
    expect(readable()).toBe('HELLO');
  });

  it('stops its interval when it goes away', async () => {
    await mount();
    host().dispatchEvent(new Event('mouseenter'));
    advance(10);
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
