import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { createMemoryStorage, withStorage } from 'ngwr/storage';
import { withWindows } from 'ngwr/window';
// Through the ENTRY POINT, deliberately: `readLayout()`'s element type was declared
// unexported in the service file, so a consumer compiled with `declaration: true`
// — every downstream Angular library — could not store the result on an exported
// class without TS4029. Every test below infers it and so cannot see that.
import type { WrWindowLayoutSnapshot } from 'ngwr/window';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrWindowManager } from './services/window-manager';

@Component({ template: '<p>body</p>' })
class Body {}

/**
 * The manager owns the stack, not the chrome: z-order, the cascade, the
 * id-singleton rule, and the saved-workspace round trip. Geometry the WINDOW
 * owns — `moveTo` and friends delegate to bridges the container wires on
 * render — so the assertions here stay on what the service itself decides.
 */
describe('WrWindowManager', () => {
  let manager: WrWindowManager;
  let engine: ReturnType<typeof createMemoryStorage>;

  const setup = (): WrWindowManager => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWr(withStorage({ engine: () => engine }))],
    });
    const created = TestBed.inject(WrWindowManager);
    TestBed.tick();
    return created;
  };

  beforeEach(() => {
    engine = createMemoryStorage();
    manager = setup();
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
  });

  describe('the open stack', () => {
    it('tracks what it opened', () => {
      expect(manager.windows()).toHaveLength(0);

      const ref = manager.open(Body, { title: 'One' });
      TestBed.tick();

      expect(manager.windows()).toEqual([ref]);
    });

    it('drops a window from the stack when it closes', async () => {
      const ref = manager.open(Body);
      TestBed.tick();

      await ref.close();
      TestBed.tick();

      expect(manager.windows()).toHaveLength(0);
    });

    it('closeAll() walks a snapshot, not the live list', async () => {
      manager.open(Body, { id: 'a' });
      manager.open(Body, { id: 'b' });
      manager.open(Body, { id: 'c' });
      TestBed.tick();

      manager.closeAll();
      await Promise.resolve();
      TestBed.tick();

      // Closing mutates the very array being iterated; walking it live skips
      // every other window and leaves half the workspace on screen.
      expect(manager.windows()).toHaveLength(0);
    });

    it('finds a window by id, and reports null once it is gone', async () => {
      const ref = manager.open(Body, { id: 'settings' });
      TestBed.tick();
      expect(manager.findById('settings')).toBe(ref);

      await ref.close();
      TestBed.tick();
      expect(manager.findById('settings')).toBeNull();
    });
  });

  describe('the close result', () => {
    it('reaches a caller that awaits before the close', async () => {
      const ref = manager.open<Body, string>(Body, { id: 'editor' });
      TestBed.tick();

      const awaited = ref.afterClosed();
      void ref.close('saved');
      TestBed.tick();

      await expect(awaited).resolves.toBe('saved');
    });

    it('replays to a caller that awaits AFTER the close', async () => {
      const ref = manager.open<Body, string>(Body, { id: 'editor' });
      TestBed.tick();

      await ref.close('saved');
      TestBed.tick();

      // A plain Subject hands a late subscriber nothing but `complete`, so the
      // promise resolves `undefined` — the saved document is dropped and the
      // caller cannot tell "saved" from "dismissed". `WrDialogRef` already uses
      // a ReplaySubject for exactly this, with the reasoning in a comment.
      await expect(ref.afterClosed()).resolves.toBe('saved');
    });

    it('gives every caller the same answer', async () => {
      const ref = manager.open<Body, string>(Body, { id: 'editor' });
      TestBed.tick();
      await ref.close('saved');
      TestBed.tick();

      // No race required to see it: two reads of one result disagreeing is the
      // whole bug in its smallest form.
      await expect(Promise.all([ref.afterClosed(), ref.afterClosed()])).resolves.toEqual(['saved', 'saved']);
    });

    it('reports a dismissal as undefined', async () => {
      const ref = manager.open<Body, string>(Body, { id: 'editor' });
      TestBed.tick();

      await ref.close();
      TestBed.tick();

      await expect(ref.afterClosed()).resolves.toBeUndefined();
    });
  });

  describe('the beforeClose veto', () => {
    const chromeClose = (ref: { _overlayRef: { overlayElement: HTMLElement } }): HTMLElement => {
      const button = ref._overlayRef.overlayElement.querySelector<HTMLElement>('.wr-window__chrome-action--close');
      expect(button, 'the window chrome renders no close button').not.toBeNull();
      return button!;
    };

    const windowEl = (ref: { _overlayRef: { overlayElement: HTMLElement } }): HTMLElement =>
      ref._overlayRef.overlayElement.querySelector<HTMLElement>('.wr-window')!;

    it('leaves a vetoed window on screen when the chrome button is what asked', async () => {
      const ref = manager.open(Body, { title: 'Untitled' });
      TestBed.tick();
      const hook = vi.fn(() => Promise.resolve(false));
      ref.beforeClose(hook);

      chromeClose(ref).click();
      await Promise.resolve();
      TestBed.tick();

      // The button used to hide the window itself before the ref got to ask the
      // hook. `.wr-window--closed` is `display: none` and nothing public writes
      // `open` back, so a vetoed window went off screen for good: still in
      // `windows()`, overlay attached, state `normal` — so not in the taskbar
      // either. Escape reaches `ref.close()` directly and never had the bug.
      expect(hook).toHaveBeenCalledTimes(1);
      expect(manager.windows()).toEqual([ref]);
      expect(windowEl(ref).classList.contains('wr-window--closed')).toBe(false);
      expect(windowEl(ref).getAttribute('aria-hidden')).not.toBe('true');
    });

    it('still closes from the chrome button when the hook agrees', async () => {
      const ref = manager.open(Body, { title: 'Untitled' });
      TestBed.tick();
      ref.beforeClose(() => Promise.resolve(true));

      chromeClose(ref).click();
      await Promise.resolve();
      TestBed.tick();

      expect(manager.windows()).toHaveLength(0);
    });

    it('runs a pending hook once, however many closes arrive', async () => {
      const ref = manager.open(Body);
      TestBed.tick();

      let release!: (ok: boolean) => void;
      const hook = vi.fn(() => new Promise<boolean>(resolve => (release = resolve)));
      ref.beforeClose(hook);

      void ref.close();
      // No keyboard and no timing race: `_doClose` is what drops the ref from
      // the manager's list, and it has not run yet, so `closeAll()` walks
      // straight back into the same pending close.
      manager.closeAll();
      await Promise.resolve();

      expect(hook).toHaveBeenCalledTimes(1);

      release(true);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      TestBed.tick();
      expect(manager.windows()).toHaveLength(0);
    });

    it('lets a declined close be retried', async () => {
      const ref = manager.open(Body);
      TestBed.tick();
      let allow = false;
      ref.beforeClose(() => Promise.resolve(allow));

      await ref.close();
      expect(manager.windows()).toEqual([ref]);

      // The in-flight latch has to clear on a veto, or "not now" would mean
      // "never" and the window could not be closed again.
      allow = true;
      await ref.close();
      TestBed.tick();
      expect(manager.windows()).toHaveLength(0);
    });
  });

  describe('singleton by id', () => {
    it('returns the open window instead of a duplicate', () => {
      const first = manager.open(Body, { id: 'settings', title: 'Settings' });
      TestBed.tick();
      const second = manager.open(Body, { id: 'settings', title: 'Settings' });
      TestBed.tick();

      // A "Settings" menu item clicked twice must re-focus, not stack a second
      // identical window behind the first.
      expect(second).toBe(first);
      expect(manager.windows()).toHaveLength(1);
    });

    it('still opens separate windows when no id is given', () => {
      manager.open(Body);
      manager.open(Body);
      TestBed.tick();

      expect(manager.windows()).toHaveLength(2);
    });
  });

  describe('z-order and cascade', () => {
    it('hands out strictly increasing z-indexes', () => {
      const first = manager.bringToFront();
      const second = manager.bringToFront();
      const third = manager.bringToFront();

      expect([second > first, third > second]).toEqual([true, true]);
    });

    it('writes the z-index onto the overlay host, not only onto the window', () => {
      const first = manager.open(Body, { id: 'a' });
      const second = manager.open(Body, { id: 'b' });
      TestBed.tick();

      first.focus();
      TestBed.tick();

      // `.wr-window` sits inside its own CDK wrapper, and that wrapper is a
      // stacking context — a z-index written inside it can never order one
      // window against another. The host is the element that competes.
      //
      // jsdom paints nothing, so this asserts the wiring; the behaviour itself
      // was measured in Chromium with `elementFromPoint` over the overlap:
      // before the fix, clicking the older window raised its z from 1001 to
      // 1003 and the hit test still returned the newer one.
      const hostZ = (ref: typeof first): number => Number(ref._overlayRef.hostElement.style.zIndex);

      expect(hostZ(first)).toBeGreaterThan(hostZ(second));
    });

    it('closes the window in FRONT on Escape, not whichever opened last', () => {
      // Focus outside every window is the case under test, so neither takes it
      // on open: the window holding focus owns the key, which the next case pins.
      const a = manager.open(Body, { id: 'a', autoFocus: false });
      const b = manager.open(Body, { id: 'b', autoFocus: false });
      TestBed.tick();

      // The user brings A forward. Attach order does not follow — `focus()`
      // re-stacks with a z-index and never re-attaches — so CDK's newest-first
      // dispatch kept offering Escape to B, behind it and not focused.
      a.focus();
      TestBed.tick();
      expect(a.z()).toBeGreaterThan(b.z());

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      TestBed.tick();

      expect(manager.windows().map(w => w.id)).toEqual(['b']);
    });

    it('lets the window holding focus take the Escape, wherever it sits in the stack', () => {
      const a = manager.open(Body, { id: 'a' });
      const b = manager.open(Body, { id: 'b' });
      TestBed.tick();

      a.focus();
      TestBed.tick();

      // Focus beats the stack: the user is IN B, so B is what Escape dismisses
      // even though A paints over it.
      const inside = b._overlayRef.overlayElement.querySelector<HTMLElement>('button');
      expect(inside, 'the window chrome renders no focusable control').not.toBeNull();
      inside!.focus();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      TestBed.tick();

      expect(manager.windows().map(w => w.id)).toEqual(['a']);
    });

    it('leaves a minimized window alone on Escape and closes the front one still on screen', () => {
      const inbox = manager.open(Body, { id: 'inbox' });
      const editor = manager.open(Body, { id: 'editor' });
      TestBed.tick();
      expect(editor.z()).toBeGreaterThan(inbox.z());

      // The editor is in front by z, but `display: none` — closing it threw away
      // a window the user could not see, along with its taskbar entry.
      editor.minimize();
      TestBed.tick();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      TestBed.tick();

      expect(manager.windows().map(w => w.id)).toEqual(['editor']);
      expect(editor.state()).toBe('minimized');
    });

    it('leaves an Escape that something inside the window already claimed', () => {
      manager.open(Body, { id: 'a' });
      TestBed.tick();
      const host = document.querySelector<HTMLElement>('wr-window')!;
      host.addEventListener('keydown', event => event.preventDefault());

      host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      TestBed.tick();

      expect(manager.windows()).toHaveLength(1);
    });

    it('reads closeOnEscape when the key arrives, so update() reaches an open window', () => {
      const ref = manager.open(Body, { id: 'a' });
      TestBed.tick();
      ref.update({ closeOnEscape: false });
      const host = document.querySelector<HTMLElement>('wr-window')!;

      host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      TestBed.tick();

      expect(manager.windows()).toHaveLength(1);
    });

    it('puts one dialog role on a window, the named one', () => {
      const ref = manager.open(Body, { title: 'Named' });
      TestBed.tick();

      const pane = ref._overlayRef.overlayElement;
      const dialogs = [pane, ...pane.querySelectorAll('*')].filter(el => el.getAttribute('role') === 'dialog');
      expect(dialogs).toHaveLength(1);
      expect(dialogs[0].tagName.toLowerCase()).toBe('wr-window');
      expect(dialogs[0].getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('steps the spawn offset so two windows do not sit exactly on top of each other', () => {
      const a = manager.nextStartOffset();
      const b = manager.nextStartOffset();

      expect(a).not.toEqual(b);
      expect([b.x - a.x, b.y - a.y]).toEqual([30, 30]);
    });

    it('wraps the cascade instead of walking off the screen, shifting each lap', () => {
      const lap = Array.from({ length: 10 }, () => manager.nextStartOffset());
      const next = Array.from({ length: 10 }, () => manager.nextStartOffset());

      // Ten opens later the offset comes back near the start; without the wrap
      // the eleventh window spawns 300px further down and the twentieth is off
      // the bottom of the viewport.
      expect(next[0].x - lap[0].x).toBeLessThan(30);
      expect(next[0].y).toBe(lap[0].y);
      // And not EXACTLY to the start: windows eleven to twenty used to open
      // precisely on top of windows one to ten, ten of twenty hidden.
      const firstLap = new Set(lap.map(o => `${o.x},${o.y}`));
      expect(next.filter(o => firstLap.has(`${o.x},${o.y}`))).toEqual([]);
    });

    it('puts no two of fifty windows exactly on top of each other', () => {
      const all = Array.from({ length: 50 }, () => manager.nextStartOffset()).map(o => `${o.x},${o.y}`);

      // A shift on both axes put lap three exactly onto lap one, a step along.
      expect(new Set(all).size).toBe(50);
    });

    it('starts the cascade from the right edge in a right-to-left page', () => {
      TestBed.inject(Directionality).valueSignal.set('rtl');
      const ref = manager.open(Body, { width: 300, height: 200 });
      TestBed.tick();

      // jsdom's viewport is 1024 wide: the first cascade step is 50px in from
      // the START edge, which is the right one here.
      expect(ref.x() + ref.width()).toBe(1024 - 50);
    });
  });

  describe('saved workspaces', () => {
    it('round-trips a snapshot of what is open', () => {
      manager.open(Body, { id: 'editor', title: 'Untitled' });
      TestBed.tick();

      manager.saveLayout('default');

      const layout: readonly WrWindowLayoutSnapshot[] | null = manager.readLayout('default');
      expect(layout).toHaveLength(1);
      expect(layout![0].id).toBe('editor');
    });

    it('saves the geometry the user chose, not the one the state imposes', () => {
      const ref = manager.open(Body, { id: 'editor', x: 100, y: 100, width: 720, height: 480 });
      TestBed.tick();
      ref.maximize();
      TestBed.tick();

      manager.saveLayout('default');
      const [snap] = manager.readLayout('default')!;

      // Maximized, `ref.width()` reports the VIEWPORT — that is its job. Saving
      // it throws away the 720x480 the user picked: restoring then re-maximizes
      // over viewport-sized "restore" geometry and "Restore down" leaves the
      // window filling the screen with no way back. The window still knows the
      // real numbers; the snapshot just has to ask for them.
      expect([snap.x, snap.y, snap.width, snap.height]).toEqual([100, 100, 720, 480]);
      expect(snap.state).toBe('maximized');
    });

    it('saves the real size of a minimized window', () => {
      const ref = manager.open(Body, { id: 'editor', x: 100, y: 100, width: 720, height: 480 });
      TestBed.tick();
      ref.minimize();
      TestBed.tick();

      const [snap] = (manager.saveLayout('default'), manager.readLayout('default')!);

      // A minimized window measures its collapsed header. Saved, that height is
      // clamped to `minHeight` on restore, so the taskbar hands back a stub
      // instead of the window the user left.
      expect([snap.width, snap.height]).toEqual([720, 480]);
      expect(snap.state).toBe('minimized');
    });

    it('reports no layout before one is saved, and none after it is cleared', () => {
      expect(manager.readLayout('never-saved')).toBeNull();

      manager.open(Body, { id: 'editor' });
      TestBed.tick();
      manager.saveLayout('default');
      manager.clearLayout('default');

      expect(manager.readLayout('default')).toBeNull();
    });

    it('keeps workspaces apart by name', () => {
      manager.open(Body, { id: 'a' });
      TestBed.tick();
      manager.saveLayout('work');
      manager.closeAll();
      TestBed.tick();
      manager.saveLayout('empty');

      expect(manager.readLayout('work')).toHaveLength(1);
      expect(manager.readLayout('empty')).toHaveLength(0);
    });

    it('survives a restore with no saved layout at all', () => {
      const opener = vi.fn();
      manager.restoreLayout('never-saved', opener);

      expect(opener).not.toHaveBeenCalled();
    });

    it('asks the consumer to reopen an id that is not on screen', () => {
      manager.open(Body, { id: 'editor', title: 'Untitled.md' });
      TestBed.tick();
      manager.saveLayout('default');
      manager.closeAll();
      TestBed.tick();

      const opener = vi.fn();
      manager.restoreLayout('default', opener);

      // Component identities are not serialisable, so reopening is the
      // consumer's job — the manager can only say which id and which title.
      expect(opener).toHaveBeenCalledTimes(1);
      expect(opener.mock.calls[0][0]).toBe('editor');
      expect(opener.mock.calls[0][1]).toEqual({ title: 'Untitled.md' });
    });

    it('does not call the opener for a window that is already open', () => {
      manager.open(Body, { id: 'editor' });
      TestBed.tick();
      manager.saveLayout('default');

      const opener = vi.fn();
      manager.restoreLayout('default', opener);

      expect(opener).not.toHaveBeenCalled();
    });

    it('seeds the reopened window at the saved geometry, not the cascade', () => {
      manager.open(Body, { id: 'editor', title: 'Untitled.md', x: 300, y: 250, width: 640, height: 480 });
      TestBed.tick();
      manager.saveLayout('default');
      manager.closeAll();
      TestBed.tick();

      manager.restoreLayout('default', id => {
        // The consumer reopens with the id ALONE — no geometry. Everything
        // below has to have come from the saved snapshot.
        manager.open(Body, { id });
        TestBed.tick();
      });

      const reopened = manager.findById('editor')!;
      // Seeded as INITIAL config, not applied after mount: applying it later is
      // what makes a restored workspace flicker through the cascade position.
      expect([reopened.x(), reopened.y(), reopened.width(), reopened.height()]).toEqual([300, 250, 640, 480]);
      expect(reopened.title()).toBe('Untitled.md');
    });

    it('saves and restores the half a window was snapped to', () => {
      const ref = manager.open(Body, { id: 'editor', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();
      ref.snapTo('left');
      manager.saveLayout('default');
      manager.closeAll();
      TestBed.tick();

      manager.restoreLayout('default', id => manager.open(Body, { id }));
      TestBed.tick();

      const back = manager.findById('editor')!;
      expect(back.snap()).toBe('left');
      expect([back.x(), back.width()]).toEqual([0, 512]);
      // And its own geometry is still underneath, for when it leaves the snap.
      back.restore();
      expect([back.x(), back.y(), back.width(), back.height()]).toEqual([100, 100, 400, 300]);
    });

    it('drops a pending restore the opener never used', () => {
      manager.open(Body, { id: 'editor', title: 'Untitled.md' });
      TestBed.tick();
      manager.saveLayout('default');
      manager.closeAll();
      TestBed.tick();

      // An opener that declines — the component behind that id is gone from the
      // app. The stashed geometry must not ambush an unrelated window opened
      // under the same id later.
      manager.restoreLayout('default', () => undefined);

      const later = manager.open(Body, { id: 'editor', x: 10, y: 10 });
      TestBed.tick();

      // Its OWN config, not the abandoned snapshot's 400/250/'Untitled.md'.
      expect([later.x(), later.y()]).toEqual([10, 10]);
      expect(later.title()).toBe('');
    });
  });

  describe('persisted position', () => {
    const saved = (key: string): unknown => engine.getItem(key) && JSON.parse(engine.getItem(key)!);

    /** Let the debounced autosave land. */
    const settle = async (): Promise<void> => {
      await new Promise<void>(resolve => setTimeout(resolve, 250));
      TestBed.tick();
    };

    it('saves the geometry as it changes and opens there next time', async () => {
      const cfg = { key: 'editor', prefix: 'app' };
      const first = manager.open(Body, { id: 'editor', storage: cfg, x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();
      first.moveTo(220, 140);
      first.resizeTo(500, 320);
      TestBed.tick();
      await settle();
      expect(saved('wr:window:app:editor')).toBeTruthy();
      await first.close();
      TestBed.tick();

      const again = manager.open(Body, { id: 'editor', storage: cfg });
      TestBed.tick();

      expect([again.x(), again.y(), again.width(), again.height()]).toEqual([220, 140, 500, 320]);
    });

    it('fits saved geometry into a smaller viewport, the way it fits a cascade', () => {
      // Saved on a desktop: 1100 wide at x 900.
      engine.setItem('wr:window:app:editor', JSON.stringify({ x: 900, y: 300, width: 1100, height: 700 }));

      const ref = manager.open(Body, { id: 'editor', storage: { key: 'editor', prefix: 'app' } });
      TestBed.tick();

      // jsdom's 1024x768: it used to open 1100 wide at x 900, its close button
      // far off the right edge and 24px of it on the glass.
      expect(ref.x()).toBeGreaterThanOrEqual(0);
      expect(ref.x() + ref.width()).toBeLessThanOrEqual(1024);
      expect(ref.y() + ref.height()).toBeLessThanOrEqual(768);
    });

    it("holds saved geometry to the window's own bounds", () => {
      engine.setItem('wr:window:app:editor', JSON.stringify({ x: 10, y: 10, width: 100, height: 50 }));

      const ref = manager.open(Body, { storage: { key: 'editor', prefix: 'app' }, minWidth: 300, minHeight: 200 });
      TestBed.tick();

      expect([ref.width(), ref.height()]).toEqual([300, 200]);
    });

    it('clears the key a window stores its geometry under', () => {
      const cfg = { key: 'editor', prefix: 'my-app' };
      manager.open(Body, { id: 'editor', storage: cfg });
      TestBed.tick();

      // Whatever the window itself wrote, this is the documented way to make
      // the next open fall back to the config defaults.
      expect(() => manager.clearPersistedPosition(cfg)).not.toThrow();
    });
  });
});

/**
 * A window is the longest-lived thing a user can have open, so it is the most
 * likely of all the overlays to still be there when the direction changes — and
 * the CDK captures the direction as a string at create and never looks again.
 * `x` / `y` are physical by design and do not move (the pane is bare; the window
 * places itself), but the chrome is not: the macOS title bar parks its button
 * cluster with `row-reverse`, which resolves against `dir`.
 */
describe('WrWindowManager follows a direction change while a window is open', () => {
  let manager: WrWindowManager;
  let dir: Directionality;

  /** What the CDK writes `dir` on: the wrapper around the pane, not the pane. */
  const wrappers = (): HTMLElement[] =>
    [...document.querySelectorAll<HTMLElement>('.wr-window-overlay')].map(p => p.parentElement!);

  /** A signal write is state, not an event: it lands on the next pass. */
  const flip = (next: Direction): void => {
    dir.valueSignal.set(next);
    TestBed.tick();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWr(withStorage({ engine: () => createMemoryStorage() }))],
    });
    manager = TestBed.inject(WrWindowManager);
    dir = TestBed.inject(Directionality);
    TestBed.tick();
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
  });

  it('rewrites the pane’s dir, so the window chrome mirrors with the page', () => {
    manager.open(Body, { title: 'One' });
    TestBed.tick();
    expect(wrappers().map(w => w.getAttribute('dir'))).toEqual(['ltr']);

    flip('rtl');

    expect(wrappers().map(w => w.getAttribute('dir'))).toEqual(['rtl']);
  });

  it('follows on every window in the stack, not only the front one', () => {
    manager.open(Body, { title: 'One' });
    manager.open(Body, { title: 'Two' });
    TestBed.tick();

    flip('rtl');

    // A window manager's whole premise is several open at once, so the follower
    // has to be per `OverlayRef` — one installed for the service would leave
    // every window but one rendering the old way.
    expect(wrappers().map(w => w.getAttribute('dir'))).toEqual(['rtl', 'rtl']);
  });

  it('gives a reopened window a follower of its own', async () => {
    const first = manager.open(Body, { title: 'One' });
    TestBed.tick();
    await first.close();
    TestBed.tick();

    manager.open(Body, { title: 'One again' });
    TestBed.tick();
    flip('rtl');

    expect(wrappers().map(w => w.getAttribute('dir'))).toEqual(['rtl']);
  });
});

/**
 * The work area: what maximize, snapping, keep-in-viewport and the cascade
 * keep a window inside. jsdom's viewport is 1024x768 and lays nothing out, so
 * an element used as bounds is given a box by hand.
 */
describe('WrWindowManager work area', () => {
  let manager: WrWindowManager;

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWr(withStorage({ engine: () => createMemoryStorage() }), ...(providers as never[]))],
    });
    manager = TestBed.inject(WrWindowManager);
  };

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('maximizes and snaps inside viewport insets', () => {
    mount();
    const ref = manager.open(Body, { bounds: { top: 64, left: 200 } });
    TestBed.tick();

    ref.maximize();
    expect([ref.x(), ref.y(), ref.width(), ref.height()]).toEqual([200, 64, 824, 704]);

    ref.snapTo('right');
    expect([ref.x(), ref.y(), ref.width(), ref.height()]).toEqual([200 + 412, 64, 412, 704]);
  });

  it('cascades from the corner of the work area and keeps a window below its top', () => {
    mount();
    const ref = manager.open(Body, { bounds: { top: 64 } });
    TestBed.tick();
    expect(ref.y()).toBe(64 + 50);

    ref.moveTo(100, 0);
    expect(ref.y()).toBe(64);
  });

  it("takes the app-wide bounds from withWindows(), and a window's own over them", () => {
    mount([provideWr(withWindows({ bounds: { top: 100 } }))]);
    const app = manager.open(Body, {});
    const own = manager.open(Body, { bounds: 'viewport' });
    TestBed.tick();
    app.maximize();
    own.maximize();

    expect([app.y(), own.y()]).toEqual([100, 0]);
  });

  it('keeps a window inside an element used as bounds', () => {
    mount();
    const desk = document.body.appendChild(document.createElement('div'));
    vi.spyOn(desk, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 600, 400));

    const ref = manager.open(Body, { bounds: desk, width: 300, height: 200 });
    TestBed.tick();
    expect(ref.x()).toBeGreaterThanOrEqual(100);
    expect(ref.y()).toBeGreaterThanOrEqual(50);

    ref.maximize();
    expect([ref.x(), ref.y(), ref.width(), ref.height()]).toEqual([100, 50, 600, 400]);
    desk.remove();
  });
});
