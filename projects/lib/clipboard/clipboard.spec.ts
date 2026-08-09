import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrClipboard } from './clipboard';

/**
 * Two write paths, and the interesting one is the fallback. `navigator.clipboard`
 * is absent on every non-secure origin — plain `http://` intranets and most
 * local dev — so the hidden-textarea path is not a legacy curiosity, it is what
 * a large share of users actually hit. It is also the path that can leave
 * wreckage behind: a stray node in the DOM, or focus on an element that no
 * longer exists.
 */
describe('WrClipboard', () => {
  let clip: WrClipboard;

  const setup = (): WrClipboard => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(WrClipboard);
  };

  /** Install (or remove) a fake async clipboard on the real jsdom navigator. */
  const withAsyncClipboard = (impl: Partial<Clipboard> | null): void => {
    if (impl === null) {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      return;
    }
    Object.defineProperty(navigator, 'clipboard', { value: impl, configurable: true });
  };

  const strayTextareas = (): number => document.querySelectorAll('textarea').length;

  beforeEach(() => {
    clip = setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  describe('the async path', () => {
    it('writes through navigator.clipboard when it is there', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      withAsyncClipboard({ writeText });

      await expect(clip.write('hello')).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('hello');
      expect(strayTextareas()).toBe(0);
    });

    it('reads through it, and reports a rejection as null rather than throwing', async () => {
      withAsyncClipboard({ readText: vi.fn().mockResolvedValue('copied') });
      await expect(clip.read()).resolves.toBe('copied');

      withAsyncClipboard({ readText: vi.fn().mockRejectedValue(new Error('denied')) });
      // A denied permission prompt is an ordinary outcome, not an error a
      // caller should have to wrap in try/catch.
      await expect(setup().read()).resolves.toBeNull();
    });

    it('reports read as null when the browser exposes no readText at all', async () => {
      withAsyncClipboard({ writeText: vi.fn() });
      await expect(setup().read()).resolves.toBeNull();
    });
  });

  describe('the textarea fallback', () => {
    beforeEach(() => {
      withAsyncClipboard(null);
      clip = setup();
    });

    it('copies through execCommand when there is no async clipboard', async () => {
      const execCommand = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

      await expect(clip.write('hello')).resolves.toBe(true);
      expect(execCommand).toHaveBeenCalledWith('copy');
    });

    it('takes the fallback when the async write REJECTS, not only when it is absent', async () => {
      const execCommand = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });
      withAsyncClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });

      await expect(setup().write('hello')).resolves.toBe(true);
      expect(execCommand).toHaveBeenCalled();
    });

    it('removes its textarea even when execCommand throws', async () => {
      Object.defineProperty(document, 'execCommand', {
        value: vi.fn(() => {
          throw new Error('not allowed');
        }),
        configurable: true,
      });

      await expect(clip.write('hello')).resolves.toBe(false);
      // Leaked once per copy attempt, this grows without bound in a long
      // session and every one of them is a focusable form control.
      expect(strayTextareas()).toBe(0);
    });

    it('gives focus back to whatever the user was on', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      Object.defineProperty(document, 'execCommand', { value: vi.fn().mockReturnValue(true), configurable: true });

      // jsdom's `select()` does NOT focus the element; a real browser's does.
      // Without this the whole test is green for the wrong reason — focus never
      // leaves the button, so nothing has to bring it back. Teaching the stub
      // the real semantics is what makes the assertion below mean anything.
      const select = vi.spyOn(HTMLTextAreaElement.prototype, 'select').mockImplementation(function (
        this: HTMLTextAreaElement
      ) {
        this.focus();
      });

      try {
        button.focus();
        expect(document.activeElement).toBe(button);

        await clip.write('hello');

        expect(select).toHaveBeenCalled();
        // The fallback selects a textarea it then removes. Left there, focus
        // lands on `<body>` and the user's next Tab restarts from the top of
        // the page — on an ordinary http:// origin, on every copy.
        expect(document.activeElement).toBe(button);
      } finally {
        select.mockRestore();
        button.remove();
      }
    });
  });

  describe('capability reporting', () => {
    it('calls write supported when only execCommand exists', async () => {
      withAsyncClipboard(null);
      Object.defineProperty(document, 'execCommand', { value: vi.fn(), configurable: true });
      const service = setup();

      expect(service.available()).toBe(true);
      await expect(service.permission('write')).resolves.not.toBe('unsupported');
    });

    it('calls read unsupported when there is no readText, whatever permissions say', async () => {
      withAsyncClipboard({ writeText: vi.fn() });
      await expect(setup().permission('read')).resolves.toBe('unsupported');
    });

    it('answers prompt when the Permissions API throws on the name', async () => {
      withAsyncClipboard({ readText: vi.fn(), writeText: vi.fn() });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: vi.fn().mockRejectedValue(new TypeError('unknown name')) },
        configurable: true,
      });

      // Firefox and Safari throw on `clipboard-read`. Reporting `unsupported`
      // there would have UIs disable a button that works.
      await expect(setup().permission('read')).resolves.toBe('prompt');
    });

    it('passes through a granted or denied state when the browser knows it', async () => {
      withAsyncClipboard({ readText: vi.fn(), writeText: vi.fn() });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: vi.fn().mockResolvedValue({ state: 'denied' }) },
        configurable: true,
      });

      await expect(setup().permission('read')).resolves.toBe('denied');
    });
  });
});
