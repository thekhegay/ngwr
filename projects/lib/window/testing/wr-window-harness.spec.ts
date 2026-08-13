import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrWindowManager, WrWindowTaskbar } from 'ngwr/window';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrWindowHarness } from './wr-window-harness';
import { WrWindowTaskbarHarness } from './wr-window-taskbar-harness';

@Component({ template: '<p class="editor">Draft body</p>' })
class Editor {}

@Component({
  imports: [WrWindowTaskbar],
  template: '<wr-window-taskbar [position]="position()" />',
})
class Host {
  readonly position = signal<'top' | 'bottom'>('bottom');
  readonly windows = inject(WrWindowManager);
}

/**
 * A window is always a service call — `WrWindow` is not exported — so every window
 * harness comes from the DOCUMENT ROOT loader, while the taskbar is an element in the
 * fixture and comes from the normal one. `provideWrOverlay()` keeps this file's
 * container out of the next one's.
 */
describe('WrWindowHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), ...(providers as never[])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  };

  const open = async (config: Parameters<WrWindowManager['open']>[1] = {}): Promise<WrWindowHarness> => {
    fixture.componentInstance.windows.open(Editor, { title: 'Untitled.md', os: 'windows', ...config });
    await fixture.whenStable();
    return rootLoader.getHarness(WrWindowHarness.with({ title: config.title! ?? 'Untitled.md' }));
  };

  beforeEach(() => mount());

  afterEach(() => {
    fixture.componentInstance.windows.closeAll();
    fixture.destroy();
  });

  it('is invisible to a fixture-scoped loader and found from the document root', async () => {
    await open();

    expect(await loader.getHarnessOrNull(WrWindowHarness)).toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrWindowHarness)).not.toBeNull();
  });

  it('reads the title, the body and the state it opened in', async () => {
    const win = await open();

    expect(await win.getTitle()).toBe('Untitled.md');
    expect(await win.getBodyText()).toBe('Draft body');
    expect([await win.getState(), await win.isOpen()]).toEqual(['normal', true]);
  });

  it('presents itself as a dialog named by its own title', async () => {
    const win = await open();

    expect(await win.getRole()).toBe('dialog');
    expect(await win.isLabelledByTitle()).toBe(true);
    expect(await win.isHiddenFromAssistiveTech()).toBe(false);
  });

  it('minimizes and restores through the same button', async () => {
    const win = await open();
    expect(await win.getMinimizeLabel()).toBe('Minimize');

    await win.minimize();

    // Minimized is a state, not a dismissal: the window is still open.
    expect([await win.getState(), await win.isOpen()]).toEqual(['minimized', true]);
    expect(await win.getMinimizeLabel()).toBe('Restore');

    await win.minimize();
    expect(await win.getState()).toBe('normal');
  });

  it('maximizes, and says "restore down" while it is', async () => {
    const win = await open();
    expect(await win.getMaximizeLabel()).toBe('Maximize');

    await win.maximize();

    expect([await win.getState(), await win.getMaximizeLabel()]).toEqual(['maximized', 'Restore down']);

    await win.maximize();
    expect(await win.getState()).toBe('normal');
  });

  it('maximizes from a double-click on the chrome as well', async () => {
    const win = await open();

    await win.doubleClickChrome();
    expect(await win.getState()).toBe('maximized');
  });

  it('translates every chrome label from the catalog', async () => {
    mount([provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]);
    const win = await open();

    expect([await win.getCloseLabel(), await win.getMinimizeLabel(), await win.getMaximizeLabel()]).toEqual([
      'Закрыть',
      'Свернуть',
      'Развернуть',
    ]);

    await win.minimize();
    expect(await win.getMinimizeLabel()).toBe('Восстановить');
  });

  it('closes from its own button, leaving the harness stale', async () => {
    const win = await open();

    await win.close();
    await fixture.whenStable();

    expect(await win.isOpen()).toBe(false);
    expect(await rootLoader.getHarnessOrNull(WrWindowHarness)).toBeNull();
  });

  it('closes on Escape unless it was told not to', async () => {
    const win = await open();
    await win.sendEscape();
    await fixture.whenStable();
    expect(await rootLoader.getHarnessOrNull(WrWindowHarness)).toBeNull();

    const stubborn = await open({ title: 'Pinned', closeOnEscape: false });
    await stubborn.sendEscape();
    await fixture.whenStable();

    expect(await stubborn.isOpen()).toBe(true);
  });

  it('renders the Linux chrome with the close button only', async () => {
    const win = await open({ os: 'linux' });

    expect(await win.getOs()).toBe('linux');
    expect([await win.hasCloseButton(), await win.hasMinimizeButton(), await win.hasMaximizeButton()]).toEqual([
      true,
      false,
      false,
    ]);
    await expect(win.minimize()).rejects.toThrow(/Linux/);
  });

  it('drops the buttons it was told to hide', async () => {
    const win = await open({ showClose: false, showMaximize: false });

    expect([await win.hasCloseButton(), await win.hasMaximizeButton()]).toEqual([false, false]);
    await expect(win.close()).rejects.toThrow(/showClose: false/);
  });

  it('reads geometry from the inline styles, not from a measured box', async () => {
    const win = await open({ x: 40, y: 60, width: 320, height: 240 });

    expect(await win.getBox()).toEqual({ x: 40, y: 60, width: 320, height: 240 });
  });

  it('renders eight resize handles, and none once maximized', async () => {
    const win = await open();

    expect(await win.isResizable()).toBe(true);
    expect((await win.getResizeHandles()).sort()).toEqual(['b', 'bl', 'br', 'l', 'r', 't', 'tl', 'tr']);

    await win.maximize();

    // A maximized window has no edges to drag, so the handles go away with the state.
    expect([await win.isResizable(), await win.getResizeHandles()]).toEqual([false, []]);
  });

  it('brings a window to the front when it is clicked', async () => {
    const first = await open({ title: 'One' });
    const second = await open({ title: 'Two' });

    expect(await second.getZIndex()).toBeGreaterThan(await first.getZIndex());

    await first.focusWindow();

    expect(await first.getZIndex()).toBeGreaterThan(await second.getZIndex());
  });

  it('keeps each window to its own content', async () => {
    await open({ title: 'One' });
    await open({ title: 'Two' });

    const one = await rootLoader.getHarness(WrWindowHarness.with({ title: 'One' }));
    const two = await rootLoader.getHarness(WrWindowHarness.with({ title: 'Two' }));

    expect([await one.getTitle(), await two.getTitle()]).toEqual(['One', 'Two']);
    expect([await one.isLabelledByTitle(), await two.isLabelledByTitle()]).toEqual([true, true]);
  });

  it('matches on the title and the state', async () => {
    const win = await open();

    expect(await rootLoader.getHarnessOrNull(WrWindowHarness.with({ state: 'normal' }))).not.toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrWindowHarness.with({ state: 'minimized' }))).toBeNull();

    await win.minimize();
    expect(await rootLoader.getHarnessOrNull(WrWindowHarness.with({ state: 'minimized' }))).not.toBeNull();
  });

  describe('the taskbar', () => {
    const taskbar = (): Promise<WrWindowTaskbarHarness> => loader.getHarness(WrWindowTaskbarHarness);

    it('is an element in the fixture, and empty until something is minimized', async () => {
      const rail = await taskbar();

      expect([await rail.isEmpty(), await rail.getTabTitles()]).toEqual([true, []]);
      expect([await rail.getPosition(), await rail.getRailLabel()]).toEqual(['bottom', 'Minimized windows']);

      await (await open()).minimize();

      expect([await rail.isEmpty(), await rail.getTabTitles()]).toEqual([false, ['Untitled.md']]);
    });

    it('names a tab for the window it restores', async () => {
      await (await open()).minimize();

      expect(await (await taskbar()).getRestoreLabel('Untitled.md')).toBe('Restore Untitled.md');
    });

    it('names an untitled window rather than leaving the tab blank', async () => {
      await (await open({ title: '' })).minimize();

      const rail = await taskbar();
      expect(await rail.getTabTitles()).toEqual(['Untitled']);
      expect(await rail.getRestoreLabel('Untitled')).toBe('Restore Untitled');
    });

    it('restores a window from its tab', async () => {
      const win = await open();
      await win.minimize();

      await (await taskbar()).restore('Untitled.md');

      expect([await win.getState(), await (await taskbar()).isEmpty()]).toEqual(['normal', true]);
    });

    it('closes a window from the tab glyph WITHOUT restoring it first', async () => {
      const win = await open();
      await win.minimize();

      await (await taskbar()).closeTab('Untitled.md');
      await fixture.whenStable();

      expect(await win.isOpen()).toBe(false);
      expect(await rootLoader.getHarnessOrNull(WrWindowHarness)).toBeNull();
    });

    /**
     * The close used to be a `role="button"` span with `tabindex="0"` INSIDE the
     * tab's own `<button>` — interactive content inside interactive content,
     * which no gate could see: a tab exists only while a window is minimized,
     * and the a11y sweep reads prerendered HTML, where the rail is not there.
     * The 16×16 hit area came out of the same markup and is fixed by the same
     * edit; 24 is what WCAG 2.5.8 asks of a pointer target.
     */
    it('keeps the two controls as siblings, both real buttons', async () => {
      await (await open()).minimize();

      const rail = (fixture.nativeElement as HTMLElement).querySelector('.wr-window-taskbar')!;
      const pill = rail.querySelector('.wr-window-taskbar__tab')!;
      const restore = pill.querySelector('.wr-window-taskbar__tab-restore')!;
      const close = pill.querySelector('.wr-window-taskbar__tab-close')!;

      expect(pill.tagName).toBe('DIV');
      expect([restore.tagName, close.tagName]).toEqual(['BUTTON', 'BUTTON']);
      expect(restore.contains(close), 'the close is nested inside the tab button again').toBe(false);
      // Neither may carry a redundant role — a `<button role="button">` is the
      // same defect wearing a different hat.
      expect([restore.getAttribute('role'), close.getAttribute('role')]).toEqual([null, null]);
      expect(close.getAttribute('tabindex')).toBeNull();
    });

    it('names what the rail holds when a tab is not there', async () => {
      const rail = await taskbar();
      await expect(rail.restore('Nope')).rejects.toThrow(/no window is minimized/);

      await (await open()).minimize();
      await expect(rail.restore('Nope')).rejects.toThrow(/Untitled\.md/);
    });

    it('translates the rail and its tabs', async () => {
      mount([
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ]);
      await (await open({ title: '' })).minimize();

      const rail = await taskbar();
      expect(await rail.getRailLabel()).toBe('Свёрнутые окна');
      expect(await rail.getTabTitles()).toEqual(['Без названия']);
      expect(await rail.getRestoreLabel('Без названия')).toBe('Восстановить Без названия');
    });

    it('follows the edge it is pinned to', async () => {
      fixture.componentInstance.position.set('top');
      await fixture.whenStable();

      expect(await (await taskbar()).getPosition()).toBe('top');
    });
  });
});
