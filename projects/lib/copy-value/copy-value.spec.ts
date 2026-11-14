import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCopyValue } from './copy-value';

@Component({
  imports: [WrCopyValue],
  template: `
    <wr-copy-value
      [value]="value()"
      [wrap]="wrap()"
      [copyLabel]="copyLabel()"
      [copiedLabel]="copiedLabel()"
      [emptyLabel]="emptyLabel()"
      (copied)="copied.push($event)"
      (copyFailed)="failed = failed + 1"
    />
  `,
})
class Host {
  readonly value = signal<string | number | null | undefined>('ORD-1042');
  readonly wrap = signal(false);
  readonly copyLabel = signal<string | null>(null);
  readonly copiedLabel = signal<string | null>(null);
  readonly emptyLabel = signal<string | null>(null);
  readonly copied: string[] = [];
  failed = 0;
}

/** Install (or remove) a fake async clipboard on the real jsdom navigator, as the `WrClipboard` spec does. */
const withAsyncClipboard = (impl: Partial<Clipboard> | undefined): void => {
  Object.defineProperty(navigator, 'clipboard', { value: impl, configurable: true });
};

describe('WrCopyValue', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let writeText: Mock<(text: string) => Promise<void>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-copy-value')!;
  const text = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-copy-value__text');
  const button = (): HTMLButtonElement | null => host().querySelector<HTMLButtonElement>('.wr-copy-value__button');
  const tooltip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-tooltip-overlay');

  /** Hover the button and let the tooltip's show delay run out. */
  const hover = async (): Promise<void> => {
    button()!.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.advanceTimersByTimeAsync(200);
    fixture.detectChanges();
  };
  const status = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-copy-value__status');

  /** Click, then let the awaited write settle and the signal it sets reach the DOM. */
  const clickCopy = async (): Promise<void> => {
    button()!.click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    withAsyncClipboard({ writeText });
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
    withAsyncClipboard(undefined);
  });

  describe('a value', () => {
    it('renders the value and a named copy button', () => {
      expect(host().classList.contains('wr-copy-value')).toBe(true);
      expect(text()!.textContent).toBe('ORD-1042');
      expect(button()!.type).toBe('button');
      expect(button()!.getAttribute('aria-label')).toBe('Copy');
      expect(button()!.hasAttribute('title')).toBe(false);
    });

    it('renders a number, zero included', () => {
      fixture.componentInstance.value.set(0);
      fixture.detectChanges();

      expect(text()!.textContent).toBe('0');
      expect(button()).not.toBeNull();
      expect(host().classList.contains('wr-copy-value--empty')).toBe(false);
    });

    it('keeps a polite status region in the DOM, empty until a copy', () => {
      expect(status()!.getAttribute('role')).toBe('status');
      expect(status()!.getAttribute('aria-live')).toBe('polite');
      expect(status()!.textContent).toBe('');
    });
  });

  describe('an empty value', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
    ])('shows the placeholder and no button for %s', (_name, value) => {
      fixture.componentInstance.value.set(value);
      fixture.detectChanges();

      expect(host().querySelector('.wr-copy-value__empty')!.textContent).toBe('-');
      expect(text()).toBeNull();
      expect(button()).toBeNull();
      expect(status()).toBeNull();
      expect(host().classList.contains('wr-copy-value--empty')).toBe(true);
    });

    it('takes its placeholder from emptyLabel', () => {
      fixture.componentInstance.value.set(null);
      fixture.componentInstance.emptyLabel.set('n/a');
      fixture.detectChanges();

      expect(host().querySelector('.wr-copy-value__empty')!.textContent).toBe('n/a');
    });
  });

  describe('copying', () => {
    it('writes the value through the clipboard and shows and announces "Copied"', async () => {
      await clickCopy();

      expect(writeText).toHaveBeenCalledExactlyOnceWith('ORD-1042');
      expect(host().classList.contains('wr-copy-value--copied')).toBe(true);
      expect(status()!.textContent).toBe('Copied');
      // The name stays what the button DOES: the status region carries the news.
      expect(button()!.getAttribute('aria-label')).toBe('Copy');
      expect(fixture.componentInstance.copied).toEqual(['ORD-1042']);
    });

    it('writes a number as its text', async () => {
      fixture.componentInstance.value.set(1042);
      fixture.detectChanges();
      await clickCopy();

      expect(writeText).toHaveBeenCalledExactlyOnceWith('1042');
    });

    it('goes back to rest after its timeout', async () => {
      await clickCopy();

      await vi.advanceTimersByTimeAsync(1499);
      fixture.detectChanges();
      expect(host().classList.contains('wr-copy-value--copied')).toBe(true);

      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();
      expect(host().classList.contains('wr-copy-value--copied')).toBe(false);
      expect(status()!.textContent).toBe('');
    });

    it('restarts the timeout on a second copy', async () => {
      await clickCopy();
      await vi.advanceTimersByTimeAsync(1000);
      await clickCopy();

      await vi.advanceTimersByTimeAsync(1000);
      fixture.detectChanges();
      expect(host().classList.contains('wr-copy-value--copied')).toBe(true);

      await vi.advanceTimersByTimeAsync(500);
      fixture.detectChanges();
      expect(host().classList.contains('wr-copy-value--copied')).toBe(false);
    });

    it('does not claim success when the write is refused', async () => {
      // jsdom has no `execCommand`, so the fallback `WrClipboard` tries next fails too.
      writeText.mockRejectedValue(new Error('denied'));
      await clickCopy();

      expect(writeText).toHaveBeenCalledOnce();
      expect(host().classList.contains('wr-copy-value--copied')).toBe(false);
      expect(status()!.textContent).toBe('');
      expect(fixture.componentInstance.copied).toEqual([]);
      expect(fixture.componentInstance.failed).toBe(1);
    });

    it('survives being destroyed while the write is pending', async () => {
      let settle!: () => void;
      writeText.mockReturnValue(new Promise<void>(resolve => (settle = resolve)));
      button()!.click();
      fixture.destroy();
      settle();

      await expect(vi.advanceTimersByTimeAsync(2000)).resolves.not.toThrow();
      expect(fixture.componentInstance.copied).toEqual([]);
    });
  });

  describe('tooltip', () => {
    it('shows the copy label in an ngwr tooltip on hover, not a native title', async () => {
      await hover();

      expect(tooltip()!.textContent).toContain('Copy');
      expect(button()!.hasAttribute('title')).toBe(false);
    });

    it('reads the copied label right after a copy', async () => {
      await hover();
      await clickCopy();

      expect(tooltip()!.textContent).toContain('Copied');

      await vi.advanceTimersByTimeAsync(1500);
      fixture.detectChanges();
      expect(tooltip()!.textContent).toContain('Copy');
      expect(tooltip()!.textContent).not.toContain('Copied');
    });
  });

  describe('wrap', () => {
    it('puts the last word and the button inside one tail, the rest in the text', () => {
      fixture.componentInstance.value.set('Long supplier name ltd');
      fixture.componentInstance.wrap.set(true);
      fixture.detectChanges();

      const tail = host().querySelector<HTMLElement>('.wr-copy-value__tail')!;
      expect(text()!.textContent).toBe('Long supplier name ');
      expect(tail.firstChild!.textContent).toBe('ltd');
      expect(tail.querySelector('.wr-copy-value__button')).toBe(button());
      expect(host().textContent).toContain('Long supplier name ltd');
    });

    it('keeps a one-word value whole in the tail', () => {
      fixture.componentInstance.wrap.set(true);
      fixture.detectChanges();

      expect(text()!.textContent).toBe('');
      expect(host().querySelector('.wr-copy-value__tail')!.textContent).toContain('ORD-1042');
    });

    it('leaves the tail empty and the full text in the text span when not wrapping', () => {
      expect(host().querySelector('.wr-copy-value__tail')!.firstChild!.textContent).toBe('');
      expect(text()!.textContent).toBe('ORD-1042');
    });

    it('truncates by default and keeps the full value in the title', () => {
      expect(host().classList.contains('wr-copy-value--wrap')).toBe(false);
      expect(text()!.getAttribute('title')).toBe('ORD-1042');
    });

    it('toggles the modifier and drops the title, since nothing is cut', () => {
      fixture.componentInstance.wrap.set(true);
      fixture.detectChanges();
      expect(host().classList.contains('wr-copy-value--wrap')).toBe(true);
      expect(text()!.hasAttribute('title')).toBe(false);

      fixture.componentInstance.wrap.set(false);
      fixture.detectChanges();
      expect(host().classList.contains('wr-copy-value--wrap')).toBe(false);
    });
  });

  describe('labels', () => {
    it('accepts overrides for the button and the copied text', async () => {
      fixture.componentInstance.copyLabel.set('Copy order id');
      fixture.componentInstance.copiedLabel.set('Order id copied');
      fixture.detectChanges();
      expect(button()!.getAttribute('aria-label')).toBe('Copy order id');

      await clickCopy();
      expect(status()!.textContent).toBe('Order id copied');
    });
  });
});

describe('WrCopyValue with a catalog', () => {
  @Component({
    imports: [WrCopyValue],
    template: `<wr-copy-value [value]="value()" copiedLabel="Mine" />`,
  })
  class CatalogHost {
    readonly value = signal<string | null>('ORD-1042');
  }

  afterEach(() => withAsyncClipboard(undefined));

  it('prefers the catalog over the fallbacks, and an input over the catalog', async () => {
    withAsyncClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        provideWrI18nStaticLoader({ en: { copyValue: { copy: 'Kopieren', copied: 'Kopiert', empty: 'leer' } } }),
      ],
    });
    const fixture = TestBed.createComponent(CatalogHost);
    fixture.detectChanges();
    // The static loader resolves asynchronously even for an object literal.
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('.wr-copy-value__button')!;
    expect(button.getAttribute('aria-label')).toBe('Kopieren');

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('.wr-copy-value__status')!.textContent).toBe('Mine');

    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(root.querySelector('.wr-copy-value__empty')!.textContent).toBe('leer');
    fixture.destroy();
  });
});
