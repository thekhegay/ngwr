import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { createMemoryStorage, provideWrStorage } from 'ngwr/storage';
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
      providers: [provideWrOverlay(), provideWrStorage({ engine: () => engine })],
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

    it('steps the spawn offset so two windows do not sit exactly on top of each other', () => {
      const a = manager.nextStartOffset();
      const b = manager.nextStartOffset();

      expect(a).not.toEqual(b);
      expect([b.x - a.x, b.y - a.y]).toEqual([30, 30]);
    });

    it('wraps the cascade instead of walking off the screen', () => {
      const first = manager.nextStartOffset();
      for (let i = 0; i < 9; i++) manager.nextStartOffset();
      const eleventh = manager.nextStartOffset();

      // Ten opens later the offset returns to the start; without the wrap the
      // eleventh window spawns 300px further down and the twentieth is off the
      // bottom of the viewport.
      expect(eleventh).toEqual(first);
    });
  });

  describe('saved workspaces', () => {
    it('round-trips a snapshot of what is open', () => {
      manager.open(Body, { id: 'editor', title: 'Untitled' });
      TestBed.tick();

      manager.saveLayout('default');

      const saved = manager.readLayout('default');
      expect(saved).toHaveLength(1);
      expect(saved![0].id).toBe('editor');
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
      manager.open(Body, { id: 'editor', title: 'Untitled.md', x: 400, y: 250, width: 640, height: 480 });
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
      expect([reopened.x(), reopened.y(), reopened.width(), reopened.height()]).toEqual([400, 250, 640, 480]);
      expect(reopened.title()).toBe('Untitled.md');
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
