/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ContentContainerComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import type { WrWindowState } from 'ngwr/window';

import type { WrWindowBox, WrWindowHarnessFilters } from './interfaces';

const STATES: readonly WrWindowState[] = ['normal', 'minimized', 'maximized'];

/**
 * Test harness for a window opened through `WrWindowManager.open()`.
 *
 * `WrWindow` is deliberately not exported — a window is always a service call — so
 * there is nothing in your fixture to load: each window is a portal in its own
 * overlay pane, and this comes from
 * `TestbedHarnessEnvironment.documentRootLoader()`.
 *
 * It is a CONTENT CONTAINER, like `WrDialogHarness`: the component you opened is
 * projected into the window's body, so `window.getHarness(WrButtonHarness…)` reads
 * ITS buttons and cannot reach another window's. That matters more here than
 * anywhere else, because windows are explicitly non-modal and several are normally
 * open at once.
 *
 * **Geometry is read from the inline styles the component writes**, never measured:
 * a window is positioned with `left` / `top` / `width` / `height` in pixels, and a
 * unit test has no layout to measure. That also makes {@link getBox} the way to
 * assert a move or a resize — including the ones a drag would produce, which no
 * synthetic pointer event can, since the drag divides by a rect that is 0×0 here.
 *
 * @example
 * ```ts
 * const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * windows.open(EditorComponent, { title: 'Untitled.md' });
 * await fixture.whenStable();
 *
 * const win = await rootLoader.getHarness(WrWindowHarness.with({ title: 'Untitled.md' }));
 * await win.maximize();
 * expect(await win.getState()).toBe('maximized');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrWindowHarness extends ContentContainerComponentHarness {
  static hostSelector = 'wr-window';

  /** Build a predicate that narrows the query — windows come in stacks. */
  static with(options: WrWindowHarnessFilters = {}): HarnessPredicate<WrWindowHarness> {
    return new HarnessPredicate(WrWindowHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('state', options.state, async (harness, state) => (await harness.getState()) === state);
  }

  private readonly titleEl = this.locatorFor('.wr-window__title');

  /**
   * Whether this window is still on the page.
   *
   * For a harness you are already HOLDING: closing disposes the overlay, so this
   * flips to `false` where a fresh `getHarnessOrNull()` comes back `null`. A
   * MINIMIZED window is still open — it is a state, not a dismissal — and this
   * stays `true` for one.
   */
  async isOpen(): Promise<boolean> {
    return (await this.host()).matchesSelector('body wr-window');
  }

  /** The title-bar text. */
  async getTitle(): Promise<string> {
    return (await this.titleEl()).text();
  }

  /** The projected `[wrWindowTitleExtra]` content, trimmed — empty when there is none. */
  async getTitleExtraText(): Promise<string> {
    return (await this.locatorFor('.wr-window__title-extra')()).text();
  }

  /** The window's visual state, from the host modifier. */
  async getState(): Promise<WrWindowState> {
    const host = await this.host();
    for (const state of STATES) {
      if (await host.hasClass(`wr-window--${state}`)) return state;
    }
    throw new Error(
      'WrWindowHarness.getState(): this host carries no `wr-window--<state>` class, which every window sets — ' +
        'the element matched is probably not an ngwr window.'
    );
  }

  /**
   * The OS the chrome is dressed as — `macos`, `windows` or `linux`.
   *
   * Worth asserting because it is not cosmetic: on macOS the buttons are a
   * traffic-light cluster in close → minimize → maximize order, and the Linux
   * chrome renders neither minimize nor maximize UNLESS `showMinimize` /
   * `showMaximize` asks for them. "No minimize on Linux" is a default, not an
   * invariant — see {@link hasMinimizeButton}.
   */
  async getOs(): Promise<string> {
    const host = await this.host();
    for (const os of ['macos', 'windows', 'linux']) {
      if (await host.hasClass(`wr-window--os-${os}`)) return os;
    }
    throw new Error('WrWindowHarness.getOs(): this window carries no `wr-window--os-<name>` class.');
  }

  /** The title-bar density — `normal` or `compact`. */
  async getChromeSize(): Promise<string> {
    return (await (await this.host()).hasClass('wr-window--chrome-compact')) ? 'compact' : 'normal';
  }

  /**
   * Where the window is and how big, in CSS pixels.
   *
   * From the inline styles the component writes, which is the only readable answer
   * without layout — and the same numbers a drag or a snap would change.
   */
  async getBox(): Promise<WrWindowBox> {
    const host = await this.host();
    return {
      x: Number.parseFloat(await host.getCssValue('left')),
      y: Number.parseFloat(await host.getCssValue('top')),
      width: Number.parseFloat(await host.getCssValue('width')),
      height: Number.parseFloat(await host.getCssValue('height')),
    };
  }

  /**
   * The window's stacking order.
   *
   * The manager hands out a z-index per focus, so this is how a spec asserts that
   * clicking a window brought it to the front — the one thing a window manager
   * exists to do, and the reason these panes are deliberately kept OUT of the
   * browser's top layer, which orders strictly by entry.
   */
  async getZIndex(): Promise<number> {
    return Number.parseFloat(await (await this.host()).getCssValue('z-index'));
  }

  /** Whether the resize handles are rendered — `resizable`, and only in the normal state. */
  async isResizable(): Promise<boolean> {
    return (await this.host()).hasClass('wr-window--resizable');
  }

  /** The resize handles currently rendered, by their edge / corner suffix. */
  async getResizeHandles(): Promise<string[]> {
    const handles = await this.locatorForAll('.wr-window__handle')();
    return Promise.all(
      handles.map(async handle => {
        const classes = (await handle.getAttribute('class')) ?? '';
        return (
          classes
            .split(/\s+/)
            .find(name => name.startsWith('wr-window__handle--'))
            ?.slice(19) ?? ''
        );
      })
    );
  }

  /** The body text of the window — the component you opened, as rendered. */
  async getBodyText(): Promise<string> {
    return (await this.locatorFor('.wr-window__body')()).text();
  }

  /** The projected `[wrWindowStatusBar]` content, trimmed. */
  async getStatusBarText(): Promise<string> {
    return (await this.locatorFor('.wr-window__status-bar')()).text();
  }

  /** Whether the chrome offers a close button (`showClose`). */
  async hasCloseButton(): Promise<boolean> {
    return (await this.chromeAction('close')) !== null;
  }

  /**
   * Whether the chrome offers a minimize button.
   *
   * `false` on Linux BY DEFAULT — that chrome is close-only by convention, which
   * is a real behavioural difference and not a style. `showMinimize: true`
   * overrides it, and a spec that asserts "no minimize on Linux" without saying
   * which of the two it means will pass for the wrong reason.
   */
  async hasMinimizeButton(): Promise<boolean> {
    return (await this.chromeAction('minimize')) !== null;
  }

  /** Whether the chrome offers a maximize button. Also `false` on Linux by default. */
  async hasMaximizeButton(): Promise<boolean> {
    return (await this.chromeAction('maximize')) !== null;
  }

  /** The close button's accessible name — the buttons are icon-only, so it is their only name. */
  async getCloseLabel(): Promise<string | null> {
    return (await this.requireAction('close', 'getCloseLabel')).getAttribute('aria-label');
  }

  /**
   * The minimize button's accessible name, which flips to the restore wording while
   * the window is minimized — the same button does both.
   */
  async getMinimizeLabel(): Promise<string | null> {
    return (await this.requireAction('minimize', 'getMinimizeLabel')).getAttribute('aria-label');
  }

  /** The maximize button's accessible name, which flips while the window is maximized. */
  async getMaximizeLabel(): Promise<string | null> {
    return (await this.requireAction('maximize', 'getMaximizeLabel')).getAttribute('aria-label');
  }

  /** Click the close button. Throws on a window opened `showClose: false`. */
  async close(): Promise<void> {
    await (await this.requireAction('close', 'close')).click();
  }

  /**
   * Click the minimize button — which RESTORES a minimized window, since it is the
   * same control.
   */
  async minimize(): Promise<void> {
    await (await this.requireAction('minimize', 'minimize')).click();
  }

  /** Click the maximize button — which restores a maximized window down. */
  async maximize(): Promise<void> {
    await (await this.requireAction('maximize', 'maximize')).click();
  }

  /**
   * Double-click the title bar, the other way to maximize.
   *
   * A separate gesture worth its own assertion, and it does NOT follow the
   * button: only an explicit `showMaximize: false` turns it off. The Linux
   * chrome hides the button by convention and keeps the gesture — which is also
   * the only way out of a window that reached `maximized` without one.
   */
  async doubleClickChrome(): Promise<void> {
    await (await this.locatorFor('.wr-window__chrome')()).dispatchEvent('dblclick');
  }

  /** Click the window body — which pulls it to the front of the stack. */
  async focusWindow(): Promise<void> {
    await (await this.host()).click();
  }

  /** Press Escape. A window opened `closeOnEscape: false` ignores it — assert, do not assume. */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** The role the window announces — `dialog`, on a non-modal window. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * Whether the window takes its accessible name from its own title element.
   *
   * Resolved rather than trusted: `aria-labelledby` naming an element that is not
   * this window's title is not a name, and with several windows open the ids are
   * the only thing keeping them apart.
   */
  async isLabelledByTitle(): Promise<boolean> {
    const labelledBy = await (await this.host()).getAttribute('aria-labelledby');
    if (!labelledBy) return false;
    return (await (await this.titleEl()).getAttribute('id')) === labelledBy;
  }

  /** Whether the window is hidden from assistive tech (`aria-hidden`, set while closed). */
  async isHiddenFromAssistiveTech(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-hidden')) === 'true';
  }

  private async chromeAction(name: 'close' | 'minimize' | 'maximize'): Promise<TestElement | null> {
    return this.locatorForOptional(`.wr-window__chrome-action--${name}`)();
  }

  private async requireAction(name: 'close' | 'minimize' | 'maximize', method: string): Promise<TestElement> {
    const button = await this.chromeAction(name);
    if (!button) {
      throw new Error(
        `WrWindowHarness.${method}(): this window has no ${name} button. It was opened with \`show` +
          `${name[0].toUpperCase()}${name.slice(1)}: false\`, or its chrome is the Linux one, which is ` +
          `close-only unless \`show${name[0].toUpperCase()}${name.slice(1)}: true\` asks for it.`
      );
    }
    return button;
  }
}
