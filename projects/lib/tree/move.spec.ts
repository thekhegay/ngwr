import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrMoveTreeNode } from './move-node';
import { WrTree } from './tree';
import type { WrTreeCanDrop, WrTreeMoveEvent, WrTreeNode } from './types';

const NODES: readonly WrTreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'app', label: 'app', children: [{ id: 'main', label: 'main.ts' }] },
      { id: 'styles', label: 'styles.css' },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'license', label: 'LICENSE' },
  { id: 'locked', label: 'node_modules', disabled: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      [nodes]="nodes()"
      [(expanded)]="expanded"
      [draggable]="draggable()"
      [canDrop]="canDrop()"
      [filter]="filter()"
      (nodeMove)="onMove($event)"
    />
  `,
})
class Host {
  readonly nodes = signal(NODES);
  readonly expanded = signal<readonly string[]>(['src']);
  readonly draggable = signal(true);
  readonly canDrop = signal<WrTreeCanDrop | null>(null);
  readonly filter = signal('');
  readonly moves: WrTreeMoveEvent[] = [];
  /** Off by default: the tree must not need the consumer to apply a move to stay intact. */
  apply = false;

  onMove(move: WrTreeMoveEvent): void {
    this.moves.push(move);
    if (this.apply) this.nodes.update(nodes => wrMoveTreeNode(nodes, move));
  }
}

@Component({
  imports: [WrTree],
  template: `<wr-tree ariaLabel="Files" draggable="true" [nodes]="nodes" />`,
})
class StaticHost {
  readonly nodes = NODES;
}

/** `label:position` for a row carrying the drop indicator. */
function dropMarks(el: HTMLElement): string[] {
  const text = el.querySelector('.wr-tree__label')!.textContent.trim();
  return ['before', 'after', 'inside']
    .filter(position => el.classList.contains(`wr-tree__row--drop-${position}`))
    .map(position => `${text}:${position}`);
}

/**
 * The drag is the browser's own (`draggable` rows and the `drag*` events), so
 * a spec dispatches those events and stubs the one thing jsdom lacks: a row's
 * rect, which decides between "before", "onto" and "after". Every stubbed row
 * is 40px tall with its top at 0.
 */
describe('WrTree drag and drop', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('.wr-tree__list')!;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-tree__row'));
  const labels = (): string[] => rows().map(row => row.querySelector('.wr-tree__label')!.textContent.trim());
  const row = (label: string): HTMLElement => {
    const el = rows()[labels().indexOf(label)];
    el.getBoundingClientRect = () => ({ top: 0, height: 40 }) as DOMRect;
    return el;
  };
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const TOP = 4;
  const MIDDLE = 18;
  const BOTTOM = 36;

  const fire = (type: string, label: string, clientY = MIDDLE): MouseEvent => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
    row(label).dispatchEvent(event);
    return event;
  };
  const marked = (): string[] => rows().flatMap(dropMarks);
  /** dragstart on one row, dragover on another, and the render in between. */
  const dragOver = async (from: string, to: string, clientY: number): Promise<MouseEvent> => {
    fire('dragstart', from);
    await settle();
    const over = fire('dragover', to, clientY);
    await settle();
    return over;
  };
  const drop = async (label: string): Promise<void> => {
    fire('drop', label);
    await settle();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => {
    vi.useRealTimers();
    fixture.destroy();
  });

  it('makes no row draggable until `draggable` is set, and renders no live region', async () => {
    host.draggable.set(false);
    await settle();

    expect(root().querySelector('[draggable]')).toBeNull();
    expect(root().querySelector('[role="status"]')).toBeNull();
    expect(list().hasAttribute('aria-describedby')).toBe(false);
  });

  it('marks every enabled row draggable, and keeps the attribute off the host', () => {
    expect(row('src').getAttribute('draggable')).toBe('true');
    expect(row('styles.css').getAttribute('draggable')).toBe('true');
    expect(row('node_modules').hasAttribute('draggable')).toBe(false);
  });

  it('keeps a static `draggable` off the host, which would make the whole tree one drag source', async () => {
    const plain = TestBed.createComponent(StaticHost);
    plain.detectChanges();
    await plain.whenStable();
    const el = plain.nativeElement as HTMLElement;

    expect(el.querySelector('wr-tree')!.hasAttribute('draggable')).toBe(false);
    expect(el.querySelector('.wr-tree__row')!.getAttribute('draggable')).toBe('true');
    plain.destroy();
  });

  it('reorders among siblings: a drop on the top edge of a row lands before it', async () => {
    const over = await dragOver('LICENSE', 'README.md', TOP);

    expect(over.defaultPrevented).toBe(true);
    expect(marked()).toEqual(['README.md:before']);
    expect(row('LICENSE').classList).toContain('wr-tree__row--dragging');

    await drop('README.md');

    expect(host.moves).toEqual([
      { node: NODES[2], from: { parentId: null, index: 2 }, to: { parentId: null, index: 1 } },
    ]);
    expect(marked()).toEqual([]);
    expect(row('LICENSE').classList).not.toContain('wr-tree__row--dragging');
  });

  it('counts the landing index without the moved row: down the list is one less than it looks', async () => {
    await dragOver('README.md', 'LICENSE', BOTTOM);
    // Under LICENSE is above its next sibling, and that row carries the line.
    expect(marked()).toEqual(['node_modules:before']);
    await drop('LICENSE');

    expect(host.moves[0].from).toEqual({ parentId: null, index: 1 });
    expect(host.moves[0].to).toEqual({ parentId: null, index: 2 });
    expect(wrMoveTreeNode(NODES, host.moves[0]).map(node => node.id)).toEqual(['src', 'license', 'readme', 'locked']);
  });

  it('reparents: a drop on the middle of a row makes the node its last child', async () => {
    await dragOver('README.md', 'styles.css', MIDDLE);
    expect(marked()).toEqual(['styles.css:inside']);
    await drop('styles.css');

    expect(host.moves[0].to).toEqual({ parentId: 'styles', index: 0 });
    // The new parent opens, so the row is in view once the consumer applies the move.
    expect(host.expanded()).toContain('styles');
  });

  it('puts a node first in an open branch when it lands under the branch row', async () => {
    await dragOver('README.md', 'src', BOTTOM);
    expect(marked()).toEqual(['app:before']);
    await drop('src');

    expect(host.moves[0].to).toEqual({ parentId: 'src', index: 0 });
  });

  it('moves a child out to the root', async () => {
    await dragOver('styles.css', 'README.md', TOP);
    await drop('README.md');

    expect(host.moves[0]).toEqual({
      node: NODES[0].children![1],
      from: { parentId: 'src', index: 1 },
      to: { parentId: null, index: 1 },
    });
  });

  it('never writes to `nodes`: the data is the same object after a drop', async () => {
    const before = JSON.stringify(NODES);
    await dragOver('LICENSE', 'src', MIDDLE);
    await drop('src');

    expect(host.moves).toHaveLength(1);
    expect(host.nodes()).toBe(NODES);
    expect(JSON.stringify(host.nodes())).toBe(before);
    expect(labels()).toEqual(['src', 'app', 'styles.css', 'README.md', 'LICENSE', 'node_modules']);
  });

  it('refuses a drop into the node itself or anything below it', async () => {
    host.expanded.set(['src', 'app']);
    await settle();

    for (const [target, y] of [
      ['src', MIDDLE],
      ['app', MIDDLE],
      ['app', TOP],
      ['main.ts', BOTTOM],
    ] as const) {
      const over = await dragOver('src', target, y);
      expect(over.defaultPrevented, `${target} at ${y}`).toBe(false);
      expect(marked()).toEqual([]);
      await drop(target);
    }
    expect(host.moves).toEqual([]);
  });

  it('shows no target where the node already is', async () => {
    const over = await dragOver('README.md', 'LICENSE', TOP);

    expect(over.defaultPrevented).toBe(false);
    expect(marked()).toEqual([]);
  });

  it('refuses a disabled row as a source and as a parent', async () => {
    const start = fire('dragstart', 'node_modules');
    expect(start.defaultPrevented).toBe(true);

    await dragOver('README.md', 'node_modules', MIDDLE);
    // The middle is refused, so the row splits in half: the upper half is "before".
    expect(marked()).toEqual(['node_modules:before']);
  });

  it('asks `canDrop`, with the parent node, and falls back to the row edge it allows', async () => {
    const seen: (string | null)[] = [];
    host.canDrop.set((node, target) => {
      seen.push(target.parent?.label ?? null);
      // Folders only: a file takes no children.
      return target.parent === null || !!target.parent.children;
    });
    await settle();

    const over = await dragOver('LICENSE', 'styles.css', MIDDLE);
    expect(seen).toContain('styles.css');
    expect(over.defaultPrevented).toBe(true);
    expect(marked()).toEqual(['styles.css:before']);
    await drop('styles.css');
    expect(host.moves[0].to).toEqual({ parentId: 'src', index: 1 });

    host.canDrop.set(() => false);
    await settle();
    const refused = await dragOver('LICENSE', 'README.md', TOP);
    expect(refused.defaultPrevented).toBe(false);
    await drop('README.md');
    expect(host.moves).toHaveLength(1);
  });

  it('opens a collapsed branch the drag rests on', async () => {
    host.expanded.set([]);
    await settle();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });

    fire('dragstart', 'README.md');
    fire('dragover', 'src', MIDDLE);
    vi.advanceTimersByTime(650);
    expect(host.expanded()).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(host.expanded()).toEqual(['src']);
  });

  it('does not open a branch the drag has left, or after the drag ended', async () => {
    host.expanded.set([]);
    await settle();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });

    fire('dragstart', 'README.md');
    fire('dragover', 'src', MIDDLE);
    fire('dragover', 'LICENSE', MIDDLE);
    vi.advanceTimersByTime(1000);
    expect(host.expanded()).not.toContain('src');

    fire('dragover', 'src', MIDDLE);
    fire('dragend', 'README.md');
    vi.advanceTimersByTime(1000);
    expect(host.expanded()).not.toContain('src');
  });

  it('clears the indicator when the drag leaves the list or ends', async () => {
    await dragOver('LICENSE', 'README.md', TOP);
    expect(marked()).toHaveLength(1);

    row('README.md').dispatchEvent(new MouseEvent('dragleave', { bubbles: true, relatedTarget: document.body }));
    await settle();
    expect(marked()).toEqual([]);

    fire('dragend', 'LICENSE');
    await settle();
    expect(row('LICENSE').classList).not.toContain('wr-tree__row--dragging');
    await drop('README.md');
    expect(host.moves).toEqual([]);
  });

  it('is off while a filter is showing', async () => {
    host.filter.set('e');
    await settle();

    expect(root().querySelector('[draggable]')).toBeNull();
  });

  it('renders the move once the consumer applies it', async () => {
    host.apply = true;
    await dragOver('LICENSE', 'src', TOP);
    await drop('src');

    expect(labels()).toEqual(['LICENSE', 'src', 'app', 'styles.css', 'README.md', 'node_modules']);
  });
});

describe('WrTree keyboard move', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('.wr-tree__list')!;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-tree__row'));
  const label = (el: HTMLElement): string => el.querySelector('.wr-tree__label')!.textContent.trim();
  const labels = (): string[] => rows().map(label);
  const announcement = (): string => root().querySelector('[role="status"]')!.textContent.trim();
  const held = (): string | null => {
    const el = root().querySelector<HTMLElement>('.wr-tree__row--dragging');
    return el ? label(el) : null;
  };
  const marked = (): string[] => rows().flatMap(dropMarks);
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const press = async (key: string, init: KeyboardEventInit = {}): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    list().dispatchEvent(event);
    await settle();
    return event;
  };
  /** Walks the cursor to a row and picks it up. */
  const grab = async (target: string): Promise<void> => {
    await press('Home');
    for (let i = labels().indexOf(target); i > 0; i -= 1) await press('ArrowDown');
    await press('Enter', { altKey: true });
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => fixture.destroy());

  it('describes the gesture on the tree', () => {
    const id = list().getAttribute('aria-describedby')!;
    expect(root().querySelector(`#${id}`)!.textContent).toContain('Alt+Enter');
  });

  it('picks a row up on Alt+Enter and says where it is', async () => {
    await grab('README.md');

    expect(held()).toBe('README.md');
    expect(announcement()).toBe('Grabbed. 2 of 4.');
    expect(host.moves).toEqual([]);
  });

  it('leaves Alt+Enter alone on a tree that is not draggable', async () => {
    host.draggable.set(false);
    await settle();
    await press('ArrowDown');
    await press('Enter', { altKey: true });

    expect(held()).toBeNull();
  });

  it('does not pick up a disabled row', async () => {
    await grab('node_modules');

    expect(held()).toBeNull();
  });

  it('moves the indicator, not the row, and reports the move on Enter', async () => {
    await grab('LICENSE');
    await press('ArrowUp');

    expect(announcement()).toBe('2 of 4.');
    expect(marked()).toEqual(['README.md:before']);
    expect(labels()).toEqual(['src', 'app', 'styles.css', 'README.md', 'LICENSE', 'node_modules']);

    await press('ArrowUp');
    expect(announcement()).toBe('1 of 4.');
    expect(marked()).toEqual(['src:before']);
    await press('ArrowUp');
    expect(announcement()).toBe('1 of 4.');

    await press('Enter');

    expect(announcement()).toBe('Dropped. 1 of 4.');
    expect(held()).toBeNull();
    expect(marked()).toEqual([]);
    expect(host.moves).toEqual([
      { node: NODES[2], from: { parentId: null, index: 2 }, to: { parentId: null, index: 0 } },
    ]);
    expect(host.nodes()).toBe(NODES);
  });

  it('holds the cursor still and selects nothing while a row is held', async () => {
    await grab('README.md');
    const down = await press('ArrowDown');

    expect(down.defaultPrevented).toBe(true);
    expect(announcement()).toBe('3 of 4.');
    expect(marked()).toEqual(['node_modules:before']);
    expect(rows().find(el => el.getAttribute('tabindex') === '0')).toBe(rows()[labels().indexOf('README.md')]);
    expect(root().querySelector('[aria-selected="true"]')).toBeNull();
  });

  it('indents into the sibling above and says which parent', async () => {
    await grab('README.md');
    await press('ArrowRight');

    expect(announcement()).toBe('src. 3 of 3.');
    expect(marked()).toEqual(['styles.css:after']);

    await press('Enter');
    expect(host.moves[0].to).toEqual({ parentId: 'src', index: 2 });
  });

  it('opens a closed parent it indents into', async () => {
    host.expanded.set([]);
    await settle();
    await grab('README.md');
    await press('ArrowRight');

    expect(host.expanded()).toEqual(['src']);
    expect(marked()).toEqual(['styles.css:after']);
  });

  it('outdents to follow its parent', async () => {
    await grab('styles.css');
    await press('ArrowLeft');

    expect(announcement()).toBe('2 of 5.');
    expect(marked()).toEqual(['README.md:before']);

    await press('Enter');
    expect(host.moves[0]).toEqual({
      node: NODES[0].children![1],
      from: { parentId: 'src', index: 1 },
      to: { parentId: null, index: 1 },
    });
  });

  it('puts the row back on Escape, and emits nothing', async () => {
    await grab('LICENSE');
    await press('ArrowUp');
    const escape = await press('Escape');

    expect(escape.defaultPrevented).toBe(true);
    expect(announcement()).toBe('Move cancelled.');
    expect(held()).toBeNull();
    expect(marked()).toEqual([]);
    expect(host.moves).toEqual([]);
  });

  it('emits nothing for a drop where the row started', async () => {
    await grab('LICENSE');
    await press('ArrowUp');
    await press('ArrowDown');
    await press('Enter');

    expect(announcement()).toBe('Dropped. 3 of 4.');
    expect(host.moves).toEqual([]);
  });

  it('steps over a place `canDrop` refuses, and stays put when every step is refused', async () => {
    host.canDrop.set((_node, target) => target.index !== 1);
    await settle();
    await grab('LICENSE');
    await press('ArrowUp');

    expect(announcement()).toBe('1 of 4.');

    host.canDrop.set(() => false);
    await settle();
    await press('ArrowDown');
    // Its own place is always allowed: going back is not a move.
    expect(announcement()).toBe('3 of 4.');
    await press('ArrowRight');
    expect(announcement()).toBe('3 of 4.');
  });

  it('puts the row back when focus leaves the tree', async () => {
    await grab('LICENSE');
    await press('ArrowUp');

    list().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await settle();

    expect(held()).toBeNull();
    expect(host.moves).toEqual([]);
  });

  it('keeps the tab stop on the row after the consumer applies the move', async () => {
    host.apply = true;
    await grab('LICENSE');
    await press('ArrowUp');
    await press('ArrowUp');
    await press('Enter');

    expect(labels()).toEqual(['LICENSE', 'src', 'app', 'styles.css', 'README.md', 'node_modules']);
    expect(label(rows().find(el => el.getAttribute('tabindex') === '0')!)).toBe('LICENSE');
  });
});

describe('wrMoveTreeNode', () => {
  const move = (id: string, from: [string | null, number], to: [string | null, number]): WrTreeMoveEvent => {
    const find = (list: readonly WrTreeNode[]): WrTreeNode | undefined => {
      for (const node of list) {
        if (node.id === id) return node;
        const below = node.children && find(node.children);
        if (below) return below;
      }
      return undefined;
    };
    return {
      node: find(NODES)!,
      from: { parentId: from[0], index: from[1] },
      to: { parentId: to[0], index: to[1] },
    };
  };

  it('reorders the root list without mutating it', () => {
    const before = JSON.stringify(NODES);
    const next = wrMoveTreeNode(NODES, move('license', [null, 2], [null, 0]));

    expect(next.map(node => node.id)).toEqual(['license', 'src', 'readme', 'locked']);
    expect(JSON.stringify(NODES)).toBe(before);
    // An untouched branch is the same object.
    expect(next[1]).toBe(NODES[0]);
  });

  it('moves a node into a branch and out of one', () => {
    const into = wrMoveTreeNode(NODES, move('readme', [null, 1], ['app', 1]));
    expect(into.map(node => node.id)).toEqual(['src', 'license', 'locked']);
    expect(into[0].children![0].children!.map(node => node.id)).toEqual(['main', 'readme']);

    const out = wrMoveTreeNode(NODES, move('main', ['app', 0], [null, 4]));
    expect(out.map(node => node.id)).toEqual(['src', 'readme', 'license', 'locked', 'main']);
    expect(out[0].children![0].children).toEqual([]);
  });

  it('gives a leaf its first child', () => {
    const next = wrMoveTreeNode(NODES, move('license', [null, 2], ['readme', 0]));

    expect(next[1].children!.map(node => node.id)).toEqual(['license']);
  });

  it('returns the array as it was for a parent it does not hold', () => {
    expect(wrMoveTreeNode(NODES, move('license', [null, 2], ['nowhere', 0]))).toBe(NODES);
  });
});
