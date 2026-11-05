import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrKbd } from './kbd';
import type { WrKbdSize } from './types';

@Component({
  imports: [WrKbd],
  template: `<wr-kbd [size]="size()" [chord]="chord()">⌘K</wr-kbd>`,
})
class Host {
  readonly size = signal<WrKbdSize>('md');
  readonly chord = signal<string | null>(null);
}

describe('WrKbd', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-kbd')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the key it was given', () => {
    expect(host().textContent).toBe('⌘K');
  });

  describe('with a chord', () => {
    const userAgent = (value: string): void => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(value);
    };

    afterEach(() => vi.restoreAllMocks());

    it('prints the chord instead of its content, the way the platform writes it', async () => {
      userAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      fixture.componentInstance.chord.set('mod+shift+k');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host().textContent).toBe('Ctrl+Shift+K');

      fixture.componentInstance.chord.set(null);
      fixture.detectChanges();
      expect(host().textContent).toBe('⌘K');
    });

    it('reads the platform after its first render, so hydrated HTML matches the server', async () => {
      // The server has no user agent and prints the Ctrl form. A client on a
      // Mac has to render the same text first, or hydration finds a mismatch,
      // and switch to ⌘ in the after-render pass.
      userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      fixture = TestBed.createComponent(Host);
      fixture.componentInstance.chord.set('mod+k');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host().textContent).toBe('⌘K');
    });

    it('takes the key words from the catalog', async () => {
      userAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideWrI18n({ defaultLocale: 'de', availableLocales: ['de'] }),
          provideWrI18nStaticLoader({ de: { kbd: { ctrl: 'Strg', shift: 'Umschalt', enter: 'Eingabe' } } }),
        ],
      });
      fixture = TestBed.createComponent(Host);
      fixture.componentInstance.chord.set('mod+shift+enter');
      fixture.detectChanges();
      // The static loader resolves through a promise even for an in-memory catalog.
      await Promise.resolve();
      await Promise.resolve();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(host().textContent).toBe('Strg+Umschalt+Eingabe');
    });
  });

  it('always names its size, including the default', () => {
    // Unlike most modifiers in the catalog this one is never omitted — the
    // stylesheet has no unsuffixed size rule to fall back on.
    expect(host().className).toBe('wr-kbd wr-kbd--md');

    for (const size of ['sm', 'lg'] as const) {
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      expect(host().className).toBe(`wr-kbd wr-kbd--${size}`);
    }
  });
});
