import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrQr } from './qr';

@Component({
  imports: [WrQr],
  template: `<wr-qr [value]="value()" [size]="size()" [ariaLabel]="ariaLabel()" bgColor="#eeeeee" />`,
})
class Host {
  readonly value = signal('https://ngwr.dev');
  readonly size = signal(160);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * A QR code is content, not decoration — it usually encodes a URL — and it is painted
 * into a `<canvas>`, which has no intrinsic accessible name and no fallback text. So the
 * name is the whole a11y contract here; there is nothing else for a screen reader to
 * find.
 *
 * The painting itself is invisible to this suite: jsdom implements no 2D context, so
 * `getContext('2d')` returns null and the generator bails at its first line. The
 * geometry is covered in `generator.spec.ts` against a recording context instead.
 */
describe('WrQr', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-qr')!;
  const canvas = (): HTMLCanvasElement => root().querySelector<HTMLCanvasElement>('canvas')!;

  const mount = (platform = 'browser'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('always emits the canvas, so the server and the client agree', () => {
    // Gating the element on the platform would make hydration compare two different
    // structures; the painting is what gets guarded instead.
    expect(canvas()).not.toBeNull();
    expect(host().classList.contains('wr-qr')).toBe(true);
    expect(host().style.background).toBe('rgb(238, 238, 238)');
  });

  it('announces itself as an image with a name', () => {
    // Without this the code is nothing at all to a screen reader: a bare `<canvas>` has
    // no implicit role worth reading and no text alternative.
    expect(canvas().getAttribute('role')).toBe('img');
    expect(canvas().getAttribute('aria-label')).toBe('QR code');
  });

  it('lets the consumer say what the code is for', () => {
    fixture.componentInstance.ariaLabel.set('QR code for the ngwr docs');
    fixture.detectChanges();
    expect(canvas().getAttribute('aria-label')).toBe('QR code for the ngwr docs');
  });

  it('survives a platform with no 2d context', () => {
    // The real jsdom path, and the one a `canvas`-less environment takes.
    expect(() => {
      fixture.componentInstance.value.set('changed');
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('does not reach for a drawing context on the server', () => {
    mount('server');
    const spy = vi.spyOn(canvas(), 'getContext');

    fixture.componentInstance.value.set('https://example.test');
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });
});

/**
 * Only a real catalog separates a lookup from a hard-coded literal: with no provider
 * both render the same English string.
 */
describe('WrQr under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    expect(canvas.getAttribute('aria-label')).toBe('QR-код');

    fixture.destroy();
  });
});

/**
 * A second host, because the interesting failure is not local. `WrQr` paints from an
 * `effect()`, and an exception thrown there does not stay inside the component that
 * threw — it escapes into `runEffectsInView`, which abandons the remaining effects of
 * the pass. So a payload past the QR capacity used to take the OTHER codes on the page
 * down with it, unpainted and unexplained, which is why the encoder's `RangeError` is
 * absorbed in `generator.ts` rather than left to propagate.
 */
@Component({
  imports: [WrQr],
  template: `
    <wr-qr [value]="first()" level="H" />
    <wr-qr [value]="second()" level="H" />
  `,
})
class PairHost {
  readonly first = signal('https://ngwr.dev/one');
  readonly second = signal('https://ngwr.dev/two');
}

describe('WrQr with a payload past the QR capacity', () => {
  afterEach(() => vi.restoreAllMocks());

  it('blanks the over-long code and leaves the rest of the view painting', () => {
    // jsdom hands out no 2D context, so the component never reaches the encoder without
    // one; the stub records nothing but which canvas was painted into.
    const painted: HTMLCanvasElement[] = [];
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      // Arrow bodies on purpose: they close over the `this` of the canvas whose
      // context was asked for, which is the only way to tell the two apart here.
      return {
        fillStyle: '',
        fillRect: (): void => {
          painted.push(this);
        },
        drawImage: (): void => undefined,
      } as unknown as CanvasRenderingContext2D;
    } as never);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(PairHost);
    fixture.detectChanges();

    const canvases = (fixture.nativeElement as HTMLElement).querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);

    // Both change in the same pass: the first past capacity, the second perfectly valid.
    painted.length = 0;
    fixture.componentInstance.first.set('a'.repeat(1300));
    fixture.componentInstance.second.set('https://ngwr.dev/still-valid');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(painted).toContain(canvases[1]);

    fixture.destroy();
  });
});
