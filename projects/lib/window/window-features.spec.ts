import { Directionality } from '@angular/cdk/bidi';
import { Component, type TemplateRef, inject, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  WR_WINDOW_REF,
  type WrWindowRef,
  type WrWindowSlotContext,
  type WrWindowState,
  type WrWindowTaskbarShow,
  WrWindowManager,
  WrWindowTaskbar,
} from 'ngwr/window';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

@Component({ template: '<p>body</p>' })
class Body {}

@Component({ template: '<button type="button" class="inner">Close me</button>' })
class ButtonBody {}

@Component({ imports: [WrWindowTaskbar], template: '<wr-window-taskbar show="all" />' })
class AllTaskbarHost {}

@Component({
  imports: [WrWindowTaskbar],
  template: '<wr-window-taskbar [show]="show()" [maxTabs]="max()" />',
})
class FoldTaskbarHost {
  readonly show = signal<WrWindowTaskbarShow>('all');
  readonly max = signal<number | null>(2);
}

/** A status bar component: it resolves the window's own ref, like the body does. */
@Component({ template: '<span class="status">{{ ref.title() }} · ready</span>' })
class StatusBar {
  readonly ref = inject(WR_WINDOW_REF);
}

@Component({
  template: '<ng-template #extra let-ref><span class="extra">{{ ref.state() }}</span></ng-template>',
})
class SlotHost {
  readonly extra = viewChild.required<TemplateRef<WrWindowSlotContext>>('extra');
}

/** A badge and a button in the title bar, the way an app fills `titleExtra`. */
@Component({
  template: `<ng-template #extra>
    <span class="badge">Draft</span>
    <button type="button" class="menu">Menu</button>
  </ng-template>`,
})
class BadgeHost {
  readonly extra = viewChild.required<TemplateRef<WrWindowSlotContext>>('extra');
}

@Component({ template: '<div class="grip">Drag me</div><p class="text">Body text</p>' })
class GripBody {}

const pointer = (type: string, init: Record<string, unknown> = {}): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 0, clientY: 0, ...init });
  return event;
};

const key = (target: Element, init: KeyboardEventInit): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  TestBed.tick();
};

/**
 * The features v15.1 added to the window. jsdom's viewport is 1024x768; every
 * number below is a pointer or key going in and an inline style or a ref signal
 * coming out.
 */
describe('WrWindow features', () => {
  let manager: WrWindowManager;

  const host = (): HTMLElement => document.querySelector<HTMLElement>('wr-window')!;
  const live = (): string => host().querySelector('.wr-window__sr-only')!.textContent.trim();

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);
    TestBed.resetTestingModule();
    manager = TestBed.inject(WrWindowManager);
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('keyboard move and resize', () => {
    const open = (config: Record<string, unknown> = {}): WrWindowRef<unknown, unknown> => {
      const ref = manager.open(ButtonBody, {
        title: 'K',
        os: 'windows',
        x: 300,
        y: 200,
        width: 400,
        height: 300,
        ...config,
      });
      TestBed.tick();
      return ref;
    };

    it('moves with Alt+F7 and the arrows, keeps it on Enter and says where it landed', () => {
      const ref = open();
      const moves: unknown[] = [];
      ref.moved.subscribe(m => moves.push(m));

      key(document.activeElement!, { key: 'F7', altKey: true });
      expect(host().classList).toContain('wr-window--keyboard-moving');
      expect(live()).toMatch(/arrow keys/i);

      key(document.activeElement!, { key: 'ArrowRight' });
      key(document.activeElement!, { key: 'ArrowRight' });
      key(document.activeElement!, { key: 'ArrowDown', shiftKey: true });
      expect([ref.x(), ref.y()]).toEqual([320, 201]);

      key(document.activeElement!, { key: 'Enter' });
      expect(host().classList).not.toContain('wr-window--keyboard-moving');
      expect(live()).toBe('Window moved to 320, 201');
      // Once, for the landing — not once per arrow.
      expect(moves).toEqual([{ x: 320, y: 201 }]);
    });

    it('does not press the focused button with the Enter that ends the mode', () => {
      open();
      expect(document.activeElement?.className).toBe('inner');
      key(document.activeElement!, { key: 'F7', altKey: true });
      key(document.activeElement!, { key: 'ArrowLeft' });

      key(document.activeElement!, { key: 'Enter' });

      expect(manager.windows()).toHaveLength(1);
      // And focus goes back to where it was.
      expect(document.activeElement?.className).toBe('inner');
    });

    it('puts the window back on Escape, and the Escape does not close it', () => {
      const ref = open();
      key(document.activeElement!, { key: 'F8', altKey: true });
      key(document.activeElement!, { key: 'ArrowRight' });
      key(document.activeElement!, { key: 'ArrowDown' });
      expect([ref.width(), ref.height()]).toEqual([410, 310]);

      key(document.activeElement!, { key: 'Escape' });

      expect(manager.windows()).toHaveLength(1);
      expect([ref.width(), ref.height()]).toEqual([400, 300]);
      expect(live()).toBe('Window resized to 400 by 300');
    });

    it('grows from the inline END in a right-to-left page', () => {
      TestBed.inject(Directionality).valueSignal.set('rtl');
      const ref = open();
      key(document.activeElement!, { key: 'F8', altKey: true });

      // Left is away from the window in RTL: the left edge moves out.
      key(document.activeElement!, { key: 'ArrowLeft' });

      expect([ref.x(), ref.width()]).toEqual([290, 410]);
    });

    it('starts from code, restoring a maximized window down first', () => {
      const ref = open();
      ref.maximize();
      TestBed.tick();

      ref.startMove();
      TestBed.tick();

      expect(ref.state()).toBe('normal');
      expect(host().classList).toContain('wr-window--keyboard-moving');
      expect(document.activeElement).toBe(host());
    });

    it('puts a maximized window back maximized on Escape, with its own geometry under it', () => {
      const ref = open();
      ref.maximize();
      TestBed.tick();

      key(document.activeElement!, { key: 'F7', altKey: true });
      expect(ref.state()).toBe('normal');
      key(document.activeElement!, { key: 'ArrowRight' });
      key(document.activeElement!, { key: 'Escape' });

      expect(ref.state()).toBe('maximized');
      ref.restore();
      expect([ref.x(), ref.y(), ref.width(), ref.height()]).toEqual([300, 200, 400, 300]);
    });

    it('puts a snapped window back in its half on Escape', () => {
      const ref = open();
      ref.snapTo('left');
      TestBed.tick();

      key(document.activeElement!, { key: 'F8', altKey: true });
      key(document.activeElement!, { key: 'ArrowRight' });
      key(document.activeElement!, { key: 'Escape' });

      expect([ref.snap(), ref.width()]).toEqual(['left', 512]);
      ref.restore();
      expect([ref.x(), ref.width()]).toEqual([300, 400]);
    });

    it('refuses when keyboard is off, and move when the window is not movable', () => {
      open({ keyboard: false });
      key(document.activeElement!, { key: 'F7', altKey: true });
      expect(host().className).not.toMatch(/keyboard/);
      manager.closeAll();
      TestBed.tick();

      open({ movable: false });
      key(document.activeElement!, { key: 'F7', altKey: true });
      expect(host().className).not.toMatch(/keyboard/);
      key(document.activeElement!, { key: 'F8', altKey: true });
      expect(host().classList).toContain('wr-window--keyboard-resizing');
    });
  });

  describe('ref streams', () => {
    it('emits the close result on `closed`, and awaitClose() resolves with it', async () => {
      const ref = manager.open<Body, string>(Body, {});
      TestBed.tick();
      const seen: unknown[] = [];
      let completed = false;
      ref.closed.subscribe({ next: v => seen.push(v), complete: () => (completed = true) });

      await ref.close('saved');

      expect([seen, completed]).toEqual([['saved'], true]);
      await expect(ref.awaitClose()).resolves.toBe('saved');
    });

    it('hears every state change, from the user and from code', () => {
      const ref = manager.open(Body, { os: 'windows' });
      TestBed.tick();
      const states: WrWindowState[] = [];
      ref.stateChanges.subscribe(s => states.push(s));

      ref.maximize();
      ref.minimize();
      ref.minimize();
      host().querySelector<HTMLElement>('.wr-window__chrome-action--maximize')!.click();
      TestBed.tick();

      expect(states).toEqual(['maximized', 'minimized', 'maximized', 'normal']);
    });

    it('reports a resize when an edge drag ends, and stays quiet for resizeTo()', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();
      const sizes: unknown[] = [];
      ref.resized.subscribe(s => sizes.push(s));

      ref.resizeTo(500, 300);
      const grip = host().querySelector<HTMLElement>('.wr-window__handle--r')!;
      grip.dispatchEvent(pointer('pointerdown', { clientX: 600, clientY: 200 }));
      grip.dispatchEvent(pointer('pointermove', { clientX: 640, clientY: 200, buttons: 1 }));
      grip.dispatchEvent(pointer('pointerup', { clientX: 640, clientY: 200 }));
      TestBed.tick();

      expect(sizes).toEqual([{ width: 540, height: 300 }]);
    });
  });

  describe('drag out of maximized or snapped', () => {
    const title = (): HTMLElement => host().querySelector<HTMLElement>('.wr-window__title')!;

    it('restores the window to its own size under the pointer once the drag goes somewhere', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();
      ref.maximize();
      TestBed.tick();

      // Grab the bar at a quarter of its 1024px width and drag down.
      title().dispatchEvent(pointer('pointerdown', { clientX: 256, clientY: 10 }));
      title().dispatchEvent(pointer('pointermove', { clientX: 256, clientY: 12, buttons: 1 }));
      TestBed.tick();
      // Under the threshold: a click, not a drag — still maximized.
      expect(ref.state()).toBe('maximized');

      title().dispatchEvent(pointer('pointermove', { clientX: 256, clientY: 110, buttons: 1 }));
      title().dispatchEvent(pointer('pointerup', { clientX: 256, clientY: 110 }));
      TestBed.tick();

      expect(ref.state()).toBe('normal');
      expect([ref.width(), ref.height()]).toEqual([400, 300]);
      // The pointer is still a quarter of the way along the bar.
      expect(ref.x()).toBe(256 - 100);
      expect(ref.y()).toBe(100);
    });

    it('leaves a maximized window still with restoreOnDrag off', () => {
      const ref = manager.open(Body, { os: 'windows', restoreOnDrag: false });
      TestBed.tick();
      ref.maximize();
      TestBed.tick();

      title().dispatchEvent(pointer('pointerdown', { clientX: 300, clientY: 10 }));
      title().dispatchEvent(pointer('pointermove', { clientX: 300, clientY: 200, buttons: 1 }));
      title().dispatchEvent(pointer('pointerup', { clientX: 300, clientY: 200 }));
      TestBed.tick();

      expect(ref.state()).toBe('maximized');
    });

    it('snaps from code, reports the snap, and a double-click un-snaps', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();

      ref.snapTo('top-right');
      TestBed.tick();
      expect([ref.snap(), ref.x(), ref.y(), ref.width(), ref.height()]).toEqual(['top-right', 512, 0, 512, 384]);

      host()
        .querySelector('.wr-window__chrome')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      TestBed.tick();
      expect([ref.snap(), ref.x(), ref.width()]).toEqual([null, 100, 400]);

      ref.snapTo('top');
      expect([ref.state(), ref.snap()]).toEqual(['maximized', null]);
    });

    it('restores down to the snapped half the window was maximized from', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();
      ref.snapTo('left');
      ref.maximize();
      ref.maximize();

      expect([ref.state(), ref.snap(), ref.width()]).toEqual(['normal', 'left', 512]);
    });
  });

  /**
   * Chromium sends `click` and `dblclick` to the element holding pointer
   * capture, which jsdom implements none of — so these stub the three methods
   * and record where capture went. A capture on the WINDOW at press time is
   * what broke the title bar's double-click and every click in `titleExtra` in
   * a real browser while these specs stayed green.
   */
  describe('presses in a grab area', () => {
    let captured: Element[];
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const title = (): HTMLElement => host().querySelector<HTMLElement>('.wr-window__title')!;

    beforeEach(() => {
      captured = [];
      proto['setPointerCapture'] = function (this: Element): void {
        captured.push(this);
      };
      proto['hasPointerCapture'] = function (this: Element): boolean {
        return captured.includes(this);
      };
      proto['releasePointerCapture'] = (): void => undefined;
    });

    afterEach(() => {
      delete proto['setPointerCapture'];
      delete proto['hasPointerCapture'];
      delete proto['releasePointerCapture'];
    });

    const press = (el: Element, from: readonly [number, number], to: readonly [number, number] = from): void => {
      el.dispatchEvent(pointer('pointerdown', { clientX: from[0], clientY: from[1] }));
      if (to !== from) el.dispatchEvent(pointer('pointermove', { clientX: to[0], clientY: to[1], buttons: 1 }));
      el.dispatchEvent(pointer('pointerup', { clientX: to[0], clientY: to[1] }));
      TestBed.tick();
    };

    it('takes no capture for a press that stays put, so a double-click on the title maximizes', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();

      press(title(), [200, 110], [202, 111]);
      press(title(), [202, 111]);
      title().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      TestBed.tick();

      expect(captured).toEqual([]);
      expect(ref.state()).toBe('maximized');
    });

    it('captures on the element pressed, never on the window, once the drag passes the threshold', () => {
      manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();

      press(title(), [200, 110], [260, 140]);

      expect(captured).toEqual([title()]);
    });

    it('reports a move only when the window moved', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300 });
      TestBed.tick();
      const moves: unknown[] = [];
      ref.moved.subscribe(m => moves.push(m));

      press(title(), [200, 110]);
      press(title(), [200, 110]);
      title().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      ref.restore();
      TestBed.tick();
      expect(moves).toEqual([]);

      press(title(), [200, 110], [260, 140]);
      expect(moves).toEqual([{ x: 160, y: 130 }]);
    });

    it('lets a badge in the title bar hear its click, and a drag that starts on it does not press it', async () => {
      const fixture = TestBed.createComponent(BadgeHost);
      fixture.detectChanges();
      const extra = fixture.componentInstance.extra();
      manager.open(Body, { os: 'windows', x: 100, y: 100, width: 400, height: 300, titleExtra: extra });
      TestBed.tick();
      const badge = host().querySelector<HTMLElement>('.badge')!;
      let clicks = 0;
      badge.addEventListener('click', () => clicks++);

      press(badge, [400, 110]);
      badge.click();
      expect(clicks).toBe(1);

      press(badge, [400, 110], [460, 160]);
      badge.click();
      expect(clicks).toBe(1);

      // The swallow lasts only for the click the drag itself ends in.
      await new Promise(resolve => setTimeout(resolve));
      badge.click();
      expect(clicks).toBe(2);
    });

    it('does not maximize for a double-click on a control in the title bar', () => {
      const fixture = TestBed.createComponent(BadgeHost);
      fixture.detectChanges();
      const ref = manager.open(Body, { os: 'windows', titleExtra: fixture.componentInstance.extra() });
      TestBed.tick();

      host()
        .querySelector('.menu')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      TestBed.tick();

      expect(ref.state()).toBe('normal');
    });

    it('maximizes for a double-click on a body drag handle, and not on the body around it', () => {
      const ref = manager.open(GripBody, { os: 'windows', dragHandle: '.grip' });
      TestBed.tick();

      host()
        .querySelector('.text')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      TestBed.tick();
      expect(ref.state()).toBe('normal');

      host()
        .querySelector('.grip')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      TestBed.tick();
      expect(ref.state()).toBe('maximized');
    });
  });

  describe('update()', () => {
    it('locks and unlocks an open window', () => {
      const ref = manager.open(Body, { os: 'windows', x: 100, y: 100 });
      TestBed.tick();

      ref.update({ movable: false, resizable: false, showClose: false, title: 'Saving…' });
      TestBed.tick();
      const bar = host().querySelector<HTMLElement>('.wr-window__title')!;
      bar.dispatchEvent(pointer('pointerdown', { clientX: 150, clientY: 110 }));
      bar.dispatchEvent(pointer('pointermove', { clientX: 250, clientY: 160, buttons: 1 }));
      bar.dispatchEvent(pointer('pointerup', { clientX: 250, clientY: 160 }));
      TestBed.tick();

      expect(ref.x()).toBe(100);
      expect(host().querySelector('.wr-window__chrome-action--close')).toBeNull();
      expect(host().querySelector('.wr-window__handle')).toBeNull();
      expect(ref.title()).toBe('Saving…');

      ref.update({ movable: true, resizable: true, showClose: true });
      TestBed.tick();
      expect(host().querySelector('.wr-window__chrome-action--close')).not.toBeNull();
      expect(host().querySelectorAll('.wr-window__handle')).toHaveLength(8);
    });

    it('re-clamps the size an open window has to new bounds', () => {
      const ref = manager.open(Body, { os: 'windows', width: 400, height: 300 });
      TestBed.tick();

      ref.update({ minWidth: 600, maxHeight: 200 });

      expect([ref.width(), ref.height()]).toEqual([600, 200]);
    });
  });

  describe('slots', () => {
    it('renders a titleExtra template with the ref, and a statusBar component with its injector', () => {
      const fixture = TestBed.createComponent(SlotHost);
      fixture.detectChanges();
      const ref = manager.open(Body, {
        title: 'Doc',
        titleExtra: fixture.componentInstance.extra(),
        statusBar: StatusBar,
      });
      TestBed.tick();

      expect(host().querySelector('.wr-window__title-extra .extra')?.textContent).toBe('normal');
      expect(host().querySelector('.wr-window__status-bar .status')?.textContent).toBe('Doc · ready');

      ref.maximize();
      TestBed.tick();
      expect(host().querySelector('.wr-window__title-extra .extra')?.textContent).toBe('maximized');
    });
  });

  describe('arranging', () => {
    const open3 = (): WrWindowRef<unknown, unknown>[] => {
      const refs = ['a', 'b', 'c'].map(
        id =>
          manager.open(Body, { id, title: id, os: 'windows', width: 400, height: 300 }) as WrWindowRef<unknown, unknown>
      );
      TestBed.tick();
      return refs;
    };

    it('tiles a grid, spreading a short last row across the whole width', () => {
      const [a, b, c] = open3();
      a.maximize();

      manager.tile();

      const boxOf = (r: WrWindowRef<unknown, unknown>): number[] => [r.x(), r.y(), r.width(), r.height()];
      expect([boxOf(a), boxOf(b), boxOf(c)]).toEqual([
        [0, 0, 512, 384],
        [512, 0, 512, 384],
        [0, 384, 1024, 384],
      ]);
    });

    it('tiles columns and rows', () => {
      const [a, , c] = open3();

      manager.tile('columns');
      expect([a.x(), a.width(), c.x(), c.height()]).toEqual([0, 341, 682, 768]);

      manager.tile('rows');
      expect([a.y(), a.height(), c.y(), c.width()]).toEqual([0, 256, 512, 1024]);
    });

    it('cascades from the corner, keeping each size and the stacking order', () => {
      const [a, b, c] = open3();
      b.focus();

      manager.cascade();

      // Back to front: a, c, b — b was raised last.
      expect([a.x(), c.x(), b.x()]).toEqual([50, 80, 110]);
      expect(b.z()).toBeGreaterThan(c.z());
      expect(c.z()).toBeGreaterThan(a.z());
      expect([a.width(), a.height()]).toEqual([400, 300]);
    });

    it('minimizes everything and brings everything back', () => {
      const [a, b] = open3();
      b.maximize();

      manager.minimizeAll();
      expect(manager.windows().every(w => w.state() === 'minimized')).toBe(true);

      manager.restoreAll();
      expect([a.state(), b.state()]).toEqual(['normal', 'maximized']);
    });
  });

  describe('the taskbar listing every window', () => {
    const tabs = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-window-taskbar__tab')];
    const restoreButtons = (): HTMLElement[] => [
      ...document.querySelectorAll<HTMLElement>('.wr-window-taskbar__tab-restore'),
    ];

    beforeEach(() => {
      TestBed.createComponent(AllTaskbarHost).detectChanges();
    });

    it('lists open windows, marks the active one and toggles it from its tab', () => {
      const a = manager.open(Body, { id: 'a', title: 'A', os: 'windows' });
      manager.open(Body, { id: 'b', title: 'B', os: 'windows' });
      TestBed.tick();

      expect(tabs().map(t => t.textContent.trim())).toEqual(['A', 'B']);
      expect(tabs().map(t => t.classList.contains('wr-window-taskbar__tab--active'))).toEqual([false, true]);
      expect(restoreButtons().map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);

      // Another window's tab switches to it…
      restoreButtons()[0].click();
      TestBed.tick();
      expect(manager.active()).toBe(a);

      // …and the active window's own tab minimizes it.
      restoreButtons()[0].click();
      TestBed.tick();
      expect(a.state()).toBe('minimized');
      expect(tabs()[0].classList).toContain('wr-window-taskbar__tab--minimized');
      expect(restoreButtons()[0].getAttribute('aria-label')).toBe('Restore A');
    });

    it('is one Tab stop, walked with the arrows, Home and End', () => {
      manager.open(Body, { id: 'a', title: 'A', os: 'windows', autoFocus: false });
      manager.open(Body, { id: 'b', title: 'B', os: 'windows', autoFocus: false });
      TestBed.tick();
      const buttons = (): HTMLElement[] => [
        ...document.querySelectorAll<HTMLElement>('.wr-window-taskbar__rail button'),
      ];
      expect(buttons().filter(b => b.tabIndex === 0)).toHaveLength(1);

      buttons()[0].focus();
      key(buttons()[0], { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttons()[1]);

      key(buttons()[1], { key: 'End' });
      expect(document.activeElement).toBe(buttons()[3]);
      expect(buttons().map(b => b.tabIndex)).toEqual([-1, -1, -1, 0]);

      key(buttons()[3], { key: 'Home' });
      expect(document.activeElement).toBe(buttons()[0]);
    });
  });

  describe('the taskbar folding what does not fit', () => {
    // A folded window keeps its tab, hidden, so these read the drawn ones.
    const drawn = '.wr-window-taskbar__tab:not(.wr-window-taskbar__tab--folded)';
    const titles = (): string[] =>
      [...document.querySelectorAll(`${drawn} .wr-window-taskbar__tab-title`)].map(t => t.textContent.trim());
    const more = (): HTMLButtonElement | null => document.querySelector('.wr-window-taskbar__more');
    const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-window-taskbar__fold-item')];
    const open = (...ids: string[]): WrWindowRef<unknown, unknown>[] =>
      ids.map(id => manager.open(Body, { id, title: id, os: 'windows', autoFocus: false }));

    it('folds every tab past maxTabs under a "+N" button that names the count', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      open('A', 'B', 'C', 'D');
      // The active window is D, the last opened, so it takes the last place.
      manager.windows()[0].activate();
      await fixture.whenStable();

      expect(titles()).toEqual(['A', 'B']);
      expect(more()!.textContent.trim()).toBe('+2');
      expect(more()!.getAttribute('aria-label')).toBe('More windows: 2');
      expect(more()!.getAttribute('aria-haspopup')).toBe('menu');

      fixture.componentInstance.max.set(null);
      await fixture.whenStable();
      expect(titles()).toEqual(['A', 'B', 'C', 'D']);
      expect(more()).toBeNull();
    });

    it('keeps the active window in the rail, in the last place', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      const [, , c] = open('A', 'B', 'C', 'D');
      c.activate();
      await fixture.whenStable();

      expect(titles()).toEqual(['A', 'C']);
      expect(document.querySelector('.wr-window-taskbar__tab--active')!.textContent.trim()).toBe('C');
    });

    it('opens the folded windows as a menu and brings the picked one forward', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.show.set('minimized');
      fixture.componentInstance.max.set(1);
      const refs = open('A', 'B', 'C');
      for (const ref of refs) ref.minimize();
      await fixture.whenStable();

      more()!.click();
      await fixture.whenStable();
      expect(more()!.getAttribute('aria-expanded')).toBe('true');
      expect(items().map(i => i.textContent.trim())).toEqual(['B', 'C']);
      expect(items().map(i => i.getAttribute('aria-label'))).toEqual(['Restore B', 'Restore C']);

      items()[1].click();
      await fixture.whenStable();
      expect(refs[2].state()).not.toBe('minimized');
      expect(manager.active()).toBe(refs[2]);
      expect(items()).toEqual([]);
      expect(more()!.textContent.trim()).toBe('+1');
    });

    it('puts the "+N" button last in the rail\'s one Tab stop', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.max.set(1);
      open('A', 'B');
      await fixture.whenStable();
      const buttons = (): HTMLElement[] => [
        ...document.querySelectorAll<HTMLElement>(`${drawn} button, .wr-window-taskbar__more`),
      ];
      expect(buttons()).toHaveLength(3);

      buttons()[0].focus();
      key(buttons()[0], { key: 'End' });
      expect(document.activeElement).toBe(more());
      expect(buttons().map(b => b.tabIndex)).toEqual([-1, -1, 0]);
    });

    it('hands focus to the "+N" button when the window minimized is folded', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.show.set('minimized');
      fixture.componentInstance.max.set(1);
      const a = manager.open(ButtonBody, { id: 'a', title: 'A', os: 'windows' });
      const b = manager.open(ButtonBody, { id: 'b', title: 'B', os: 'windows' });
      await fixture.whenStable();
      a.minimize();
      await fixture.whenStable();

      b.activate();
      await fixture.whenStable();
      document.querySelector<HTMLElement>('wr-window:not(.wr-window--minimized) .inner')!.focus();
      b.minimize();
      await fixture.whenStable();

      expect(titles()).toEqual(['A']);
      expect(document.activeElement).toBe(more());
    });

    it('keeps a folded tab laid out but hidden, inert and out of the Tab order', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.max.set(1);
      open('A', 'B');
      manager.windows()[0].activate();
      await fixture.whenStable();

      const folded = document.querySelector<HTMLElement>('.wr-window-taskbar__tab--folded')!;
      expect(folded.textContent.trim()).toBe('B');
      expect(folded.hasAttribute('inert')).toBe(true);
      expect([...folded.querySelectorAll('button')].map(b => b.tabIndex)).toEqual([-1, -1]);
    });

    it('folds what the width cannot hold, at the width each title asks for', async () => {
      // jsdom lays nothing out, so the rail's width, each tab's width, the gap
      // and the button are given here, and the arithmetic is what is under test:
      // a tab is 40px plus 10px a letter, the rail 400px, the gap 4px, "+N" 40px.
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = '.wr-window-taskbar__rail { column-gap: 4px; }';
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains('wr-window-taskbar__more')) return new DOMRect(0, 0, 40, 28);
        if (this.classList.contains('wr-window-taskbar__tab')) {
          return new DOMRect(0, 0, 40 + 10 * this.textContent.trim().length, 28);
        }
        return new DOMRect();
      });
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.max.set(null);
      const taskbar = (fixture.nativeElement as HTMLElement).querySelector('wr-window-taskbar')!;
      Object.defineProperty(taskbar, 'clientWidth', {
        configurable: true,
        get: () => 400,
      });
      const titled = (...names: string[]): WrWindowRef<unknown, unknown>[] =>
        names.map(title => manager.open(Body, { title, os: 'windows', autoFocus: false }));

      try {
        // 90 + 80 + 120 + 90 and three gaps is 392px: four tabs of their own
        // width fit where four of one shared minimum would not.
        const [, , calendar] = titled('Notes', 'Mail', 'Calendar', 'Music');
        manager.windows()[0].activate();
        await fixture.whenStable();
        expect(titles()).toEqual(['Notes', 'Mail', 'Calendar', 'Music']);
        expect(more()).toBeNull();

        // A fifth needs 496px. Beside "+N" four need 436px, three 342px.
        titled('Photos');
        manager.windows()[0].activate();
        await fixture.whenStable();
        expect(titles()).toEqual(['Notes', 'Mail', 'Calendar']);
        expect(more()!.textContent.trim()).toBe('+2');

        // A shorter title makes room: four beside "+N" now need 386px.
        calendar.setTitle('Cal');
        await fixture.whenStable();
        expect(titles()).toEqual(['Notes', 'Mail', 'Cal', 'Music']);
        expect(more()!.textContent.trim()).toBe('+1');
      } finally {
        style.remove();
      }
    });

    /**
     * The layout jsdom does not have: a tab is 40px plus 10px a letter, the rail
     * `width` inside with a 4px gap, "+N" 40px. Returns the undo.
     */
    const layOut = (fixture: { nativeElement: unknown }, width = 400): (() => void) => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = '.wr-window-taskbar__rail { column-gap: 4px; }';
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains('wr-window-taskbar__more')) return new DOMRect(0, 0, 40, 28);
        if (this.classList.contains('wr-window-taskbar__tab')) {
          return new DOMRect(0, 0, 40 + 10 * this.textContent.trim().length, 28);
        }
        return new DOMRect();
      });
      const taskbar = (fixture.nativeElement as HTMLElement).querySelector('wr-window-taskbar')!;
      Object.defineProperty(taskbar, 'clientWidth', { configurable: true, get: () => width });
      return () => style.remove();
    };

    it('hands focus to "+N" when the width folds the window just minimized', async () => {
      // The new tab has no width yet on the render that lists it, so it is drawn
      // there and folds the pass after — focus has to wait for the "+N" that
      // pass draws, not fall back to the opener or <body>.
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.show.set('minimized');
      fixture.componentInstance.max.set(null);
      const undo = layOut(fixture);
      try {
        // 90 + 80 + 120 and two gaps is 298px, so no "+N" yet.
        for (const title of ['Notes', 'Mail', 'Calendar']) {
          manager.open(Body, { title, os: 'windows', autoFocus: false }).minimize();
        }
        await fixture.whenStable();
        expect(more()).toBeNull();

        // A 100px fourth needs 402px; three beside "+N" need 342px.
        const photos = manager.open(ButtonBody, { title: 'Photos', os: 'windows' });
        await fixture.whenStable();
        document.querySelector<HTMLElement>('wr-window:not(.wr-window--minimized) .inner')!.focus();
        photos.minimize();
        await fixture.whenStable();

        expect(titles()).toEqual(['Notes', 'Mail', 'Calendar']);
        expect(more()!.textContent.trim()).toBe('+1');
        expect(document.activeElement).toBe(more());
      } finally {
        undo();
      }
    });

    it('reads a one-pixel clip as rounding, so a row that fits stays drawn', async () => {
      // 90 + 80 + 120 + 90 and three gaps is 392px, the rail's width exactly. A
      // title whose whole-pixel scroll and client widths differ by one is not
      // too narrow for its text; counted, four such pixels would fold a row that
      // fits, and the row unfolded again would read them away — a loop.
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.max.set(null);
      const undo = layOut(fixture, 392);
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('wr-window-taskbar__tab-title') ? 1 : 0;
      });
      try {
        for (const title of ['Notes', 'Mail', 'Calendar', 'Music']) {
          manager.open(Body, { title, os: 'windows', autoFocus: false });
        }
        manager.windows()[0].activate();
        await fixture.whenStable();

        expect(titles()).toEqual(['Notes', 'Mail', 'Calendar', 'Music']);
        expect(more()).toBeNull();
      } finally {
        undo();
      }
    });

    it('reads maxTabs from an attribute and never shows fewer than one tab', async () => {
      const fixture = TestBed.createComponent(FoldTaskbarHost);
      fixture.componentInstance.max.set(0);
      open('A', 'B');
      manager.windows()[0].activate();
      await fixture.whenStable();

      expect(titles()).toEqual(['A']);
      expect(more()!.textContent.trim()).toBe('+1');
    });
  });

  describe('the taskbar reserve', () => {
    it('stops a maximized window short of a taskbar that shows tabs', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return this.tagName === 'WR-WINDOW-TASKBAR' && this.querySelector('.wr-window-taskbar__rail')
          ? new DOMRect(400, 708, 224, 48)
          : new DOMRect(0, 0, 0, 0);
      });
      TestBed.createComponent(AllTaskbarHost).detectChanges();
      const ref = manager.open(Body, { os: 'windows' });
      TestBed.tick();

      ref.maximize();
      TestBed.tick();

      // 768 - 708: the strip from the rail's top edge to the bottom of the viewport.
      expect([ref.y(), ref.height()]).toEqual([0, 708]);
    });
  });
});
