import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCircularText } from './circular-text';
import type { WrCircularTextHover } from './interfaces';

@Component({
  imports: [WrCircularText],
  template: `<wr-circular-text [text]="text()" [spinDuration]="spinDuration()" [onHover]="onHover()" />`,
})
class Host {
  readonly text = signal('NGWR');
  readonly spinDuration = signal(20);
  readonly onHover = signal<WrCircularTextHover>('speedUp');
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * The spin is a Web Animation, which jsdom does not implement — so `Element.animate`
 * is stubbed here rather than avoided, because the ANGLE each character is placed
 * at is the component's real output and it is exact.
 */
describe('WrCircularText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let animations: { effect: Keyframe[] | null; options: KeyframeAnimationOptions | undefined }[] = [];
  let animateBefore: PropertyDescriptor | undefined;

  const chars = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-circular-text__char'),
  ];

  const mount = async (providers: unknown[] = []): Promise<void> => {
    animations = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // `Element.animate` does not exist in jsdom, so this is an assignment rather
    // than a spy — and it therefore has to be undone BY HAND. Leaving it in place
    // leaks into whichever file vitest runs next, which is how this spec turned a
    // green local run into a red CI one: the order differs, so the damage lands
    // somewhere else each time.
    animateBefore = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    Element.prototype.animate = function (keyframes: Keyframe[] | null, options?: KeyframeAnimationOptions) {
      animations.push({ effect: keyframes, options });
      return {
        cancel: () => undefined,
        finish: () => undefined,
        onfinish: null,
        playbackRate: 1,
      } as unknown as Animation;
    };

    await mount();
  });

  afterEach(() => {
    // `fixture` is only set once `mount` gets that far; tearing down a fixture
    // that was never created hides the real failure behind a TypeError.
    fixture?.destroy();
    if (animateBefore) Object.defineProperty(Element.prototype, 'animate', animateBefore);
    else delete (Element.prototype as Partial<Element>).animate;
    vi.restoreAllMocks();
  });

  it('places one character per span, evenly round the circle', () => {
    // Four characters, so 90° apart — and each is pushed out by the orbit radius
    // rather than along a diagonal.
    expect(chars().map(el => el.textContent)).toEqual(['N', 'G', 'W', 'R']);
    expect(chars().map(el => el.style.transform)).toEqual([
      'rotate(0deg) translateY(calc(-1 * var(--wr-circular-text-radius)))',
      'rotate(90deg) translateY(calc(-1 * var(--wr-circular-text-radius)))',
      'rotate(180deg) translateY(calc(-1 * var(--wr-circular-text-radius)))',
      'rotate(270deg) translateY(calc(-1 * var(--wr-circular-text-radius)))',
    ]);
  });

  it('counts a surrogate pair as one character', () => {
    fixture.componentInstance.text.set('a🚀');
    fixture.detectChanges();

    expect(chars().map(el => el.textContent)).toEqual(['a', '🚀']);
    expect(chars()[1].style.transform).toContain('rotate(180deg)');
  });

  it('renders nothing for empty text', () => {
    fixture.componentInstance.text.set('');
    fixture.detectChanges();

    expect(chars()).toEqual([]);
  });

  it('spins for the duration it was given', () => {
    expect(animations.at(-1)!.options!.duration).toBe(20_000);
  });

  it('does not spin at all for someone who asked for less motion', async () => {
    animations.length = 0;
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(animations).toEqual([]);
    expect(chars().length).toBe(4);
  });
});
