import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCopyToClipboard } from './copy-to-clipboard';

/**
 * Copying is a two-path operation and the interesting half is the second path.
 * `navigator.clipboard` is missing on every non-secure origin — plain `http://`
 * intranets, most local dev — and it REJECTS on a page that has lost focus or
 * been denied the permission, so the hidden-textarea fallback is not a legacy
 * curiosity: it is what a large share of real copies go through.
 *
 * jsdom implements neither, which is exactly why they have to be staged here.
 * Both are installed on the real objects the directive reaches through
 * (`document.defaultView.navigator`, `document`) and restored to their original
 * descriptors afterwards — a global left stubbed poisons the next spec file.
 *
 * The assertions are the two outputs, because they are what a consumer wires a
 * "Copied!" toast to. `(copied)` on a copy that did not happen is the worst
 * outcome this directive can produce: the user walks away and pastes something
 * else.
 */
@Component({
  imports: [WrCopyToClipboard],
  template: `
    <button
      type="button"
      [wrCopyToClipboard]="text()"
      (copied)="copied.push($event)"
      (copyFailed)="failed.push($event)"
    >
      Copy
    </button>
  `,
})
class Host {
  readonly text = signal('ngwr');
  readonly copied: string[] = [];
  readonly failed: unknown[] = [];
}

describe('WrCopyToClipboard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  // Captured before anything is stubbed, so the restore puts back what jsdom
  // actually had rather than what this file assumes it had.
  const pristineClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const pristineExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');

  const button = (): HTMLButtonElement => (fixture.nativeElement as HTMLElement).querySelector('button')!;
  const copied = (): string[] => fixture.componentInstance.copied;
  const failed = (): unknown[] => fixture.componentInstance.failed;
  const strayTextareas = (): number => document.querySelectorAll('textarea').length;

  /** Install (or remove) the async clipboard the directive prefers. */
  const withAsyncClipboard = (impl: Partial<Clipboard> | null): void => {
    Object.defineProperty(navigator, 'clipboard', { value: impl ?? undefined, configurable: true });
  };

  /** Install (or remove) the legacy command the fallback depends on. */
  const withExecCommand = (impl: ((command: string) => boolean) | null): void => {
    Object.defineProperty(document, 'execCommand', { value: impl ?? undefined, configurable: true });
  };

  /**
   * `onClick` is `async`: the click handler returns at its first `await`, so the
   * emissions land one or more microtasks later. A macrotask hop drains all of
   * them, whichever path the copy took.
   */
  const clickAndSettle = async (): Promise<void> => {
    button().click();
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (pristineClipboard) Object.defineProperty(navigator, 'clipboard', pristineClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');

    if (pristineExecCommand) Object.defineProperty(document, 'execCommand', pristineExecCommand);
    else Reflect.deleteProperty(document, 'execCommand');

    vi.restoreAllMocks();
  });

  describe('the async clipboard', () => {
    it('writes the bound text and reports it back', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      withAsyncClipboard({ writeText });

      await clickAndSettle();

      expect(writeText).toHaveBeenCalledWith('ngwr');
      // `(copied)` carries the text so a toast can quote it.
      expect(copied()).toEqual(['ngwr']);
      expect(failed()).toEqual([]);
      // The async path must not go anywhere near the textarea dance.
      expect(strayTextareas()).toBe(0);
    });

    it('reads the input at click time, not at construction', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      withAsyncClipboard({ writeText });

      fixture.componentInstance.text.set('changed');
      fixture.detectChanges();
      await clickAndSettle();

      // A row of copy buttons over a table re-binds this input constantly; a
      // value captured once copies the wrong cell for the rest of the session.
      expect(writeText).toHaveBeenCalledWith('changed');
      expect(copied()).toEqual(['changed']);

      // Twice, because once is not enough to tell "reads it at click time" from
      // "reads it at the FIRST click time" — and a filter that re-binds the same
      // button is the everyday version of the second one.
      fixture.componentInstance.text.set('again');
      fixture.detectChanges();
      await clickAndSettle();

      expect(writeText).toHaveBeenNthCalledWith(2, 'again');
      expect(copied()).toEqual(['changed', 'again']);
    });

    it('falls back when the write REJECTS, not only when the API is absent', async () => {
      const execCommand = vi.fn().mockReturnValue(true);
      withExecCommand(execCommand);
      withAsyncClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('Document is not focused')) });

      await clickAndSettle();

      // A rejection is the everyday case — a page that lost focus, a permission
      // the user never granted — and the legacy command is not subject to
      // either, so it is a recovery rather than a consolation.
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(copied()).toEqual(['ngwr']);
      expect(failed()).toEqual([]);
    });

    it('reports a failure when neither path can write', async () => {
      withAsyncClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
      withExecCommand(null);

      await clickAndSettle();

      // Silence here would be worse than an error: the UI shows a copy button
      // that does nothing and says nothing.
      expect(copied()).toEqual([]);
      expect(failed()).toHaveLength(1);
      // And the textarea is removed on the way out — leaked once per attempt it
      // grows without bound, and every one of them is a focusable form control.
      expect(strayTextareas()).toBe(0);
    });
  });

  describe('the legacy fallback', () => {
    beforeEach(() => {
      withAsyncClipboard(null);
    });

    it('copies through a textarea carrying the text, and clears it away', async () => {
      let textInTheDom: string | null = null;
      const execCommand = vi.fn((): boolean => {
        // The command copies the current selection, so what is IN the document
        // at that moment is the whole payload — asserting it afterwards would
        // only prove the node was removed.
        textInTheDom = document.querySelector('textarea')?.value ?? null;
        return true;
      });
      withExecCommand(execCommand);

      await clickAndSettle();

      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(textInTheDom).toBe('ngwr');
      expect(copied()).toEqual(['ngwr']);
      expect(strayTextareas()).toBe(0);
    });

    it('reports a refused copy command as a failure, not a success', async () => {
      // `execCommand` REPORTS failure instead of throwing it: a document without
      // focus, or a browser that refuses the command, hands back `false` and
      // copies nothing. Ignoring that return value is a "Copied!" toast over an
      // unchanged clipboard — the user pastes whatever was there before.
      const execCommand = vi.fn().mockReturnValue(false);
      withExecCommand(execCommand);

      await clickAndSettle();

      expect(copied()).toEqual([]);
      expect(failed()).toHaveLength(1);
    });

    it('does not retry the write it has just made', async () => {
      const execCommand = vi.fn().mockReturnValue(false);
      withExecCommand(execCommand);

      await clickAndSettle();

      // The retry in the catch exists to recover from the ASYNC path failing.
      // With no async path there is nothing to recover from, and running the
      // same failing write twice means two selections and two focus jumps for
      // one press.
      expect(execCommand).toHaveBeenCalledTimes(1);
      expect(failed()).toHaveLength(1);
    });

    it('gives focus back to the element that was copied from', async () => {
      withExecCommand(vi.fn().mockReturnValue(true));

      // jsdom's `select()` does not move focus; a real browser's does. Without
      // teaching the stub that, the assertion below is green for the wrong
      // reason — focus would never have left the button in the first place.
      const select = vi.spyOn(HTMLTextAreaElement.prototype, 'select').mockImplementation(function (
        this: HTMLTextAreaElement
      ) {
        this.focus();
      });

      button().focus();
      expect(document.activeElement).toBe(button());

      await clickAndSettle();

      expect(select).toHaveBeenCalled();
      // The fallback selects a textarea it then removes. Left there, focus lands
      // on `<body>` and the user's next Tab restarts from the top of the page —
      // on every copy, on any origin without the async clipboard.
      expect(document.activeElement).toBe(button());
      expect(copied()).toEqual(['ngwr']);
    });

    it('keeps the document clean when the command throws', async () => {
      withExecCommand(
        vi.fn(() => {
          throw new Error('not allowed');
        })
      );

      await clickAndSettle();

      expect(copied()).toEqual([]);
      expect(failed()).toHaveLength(1);
      expect(strayTextareas()).toBe(0);
    });
  });
});
