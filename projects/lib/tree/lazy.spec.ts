import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { Subject, of } from 'rxjs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeChildrenLoader, WrTreeNode } from './types';

const NODES: readonly WrTreeNode[] = [
  { id: 'remote', label: 'Remote', hasChildren: true },
  { id: 'local', label: 'Local', children: [{ id: 'file', label: 'file.txt' }] },
];

const CHILDREN: readonly WrTreeNode[] = [
  { id: 'r1', label: 'One' },
  { id: 'r2', label: 'Two', hasChildren: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      [nodes]="nodes"
      [(expanded)]="expanded"
      [loadChildren]="loader()"
      [loadingLabel]="loadingLabel()"
    />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly expanded = signal<readonly string[]>([]);
  readonly loader = signal<WrTreeChildrenLoader | null>(null);
  readonly loadingLabel = signal<string | null>(null);
}

/** A promise the spec settles by hand, so the loading row can be looked at. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('WrTree lazy children', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-tree__row'));
  const labels = (): string[] => rows().map(row => row.querySelector('.wr-tree__label')!.textContent.trim());
  const row = (label: string): HTMLElement => rows()[labels().indexOf(label)];
  const status = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-tree__status');
  const toggle = (label: string): void => row(label).querySelector<HTMLElement>('button.wr-tree__toggle')!.click();

  /** Renders without `whenStable()`, which waits for the very load a spec is holding open. */
  const render = (): void => {
    fixture.detectChanges();
    fixture.detectChanges();
  };
  const settle = async (): Promise<void> => {
    render();
    await fixture.whenStable();
    render();
  };

  const mount = (loader: WrTreeChildrenLoader | null): void => {
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.loader.set(loader);
    render();
  };

  afterEach(() => fixture.destroy());

  it('draws a branch for a node that only says it has children, and loads nothing yet', () => {
    const loader = vi.fn(() => Promise.resolve(CHILDREN));
    mount(loader);

    expect(row('Remote').getAttribute('aria-expanded')).toBe('false');
    expect(row('Remote').querySelector('button.wr-tree__toggle')).not.toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it('shows a loading row and marks the branch busy while the loader runs', () => {
    const pending = deferred<readonly WrTreeNode[]>();
    const loader = vi.fn(() => pending.promise);
    mount(loader);

    toggle('Remote');
    render();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith(NODES[0]);
    expect(row('Remote').getAttribute('aria-expanded')).toBe('true');
    expect(row('Remote').getAttribute('aria-busy')).toBe('true');
    expect(status()).not.toBeNull();
    expect(status()!.getAttribute('role')).toBe('treeitem');
    expect(status()!.getAttribute('aria-level')).toBe('2');
    expect(status()!.querySelector('wr-spinner')).not.toBeNull();
    expect(status()!.textContent.trim()).toBe('Loading…');
    // Not a node: the harness and `aria-posinset` count rows of that class.
    expect(labels()).toEqual(['Remote', 'Local']);
  });

  it('takes the loading text from `loadingLabel`', () => {
    mount(() => deferred<readonly WrTreeNode[]>().promise);
    fixture.componentInstance.loadingLabel.set('Fetching');

    toggle('Remote');
    render();

    expect(status()!.textContent.trim()).toBe('Fetching');
  });

  it('renders the children when the loader answers', async () => {
    const pending = deferred<readonly WrTreeNode[]>();
    mount(() => pending.promise);
    toggle('Remote');
    render();

    pending.resolve(CHILDREN);
    await settle();

    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
    expect(status()).toBeNull();
    expect(row('Remote').hasAttribute('aria-busy')).toBe(false);
    expect(row('One').getAttribute('aria-level')).toBe('2');
    // A loaded child can be lazy in its turn.
    expect(row('Two').getAttribute('aria-expanded')).toBe('false');
  });

  it('loads once: a second expand reads the cache', async () => {
    const loader = vi.fn(() => Promise.resolve(CHILDREN));
    mount(loader);

    toggle('Remote');
    await settle();
    toggle('Remote');
    await settle();
    expect(labels()).toEqual(['Remote', 'Local']);

    toggle('Remote');
    await settle();

    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('loads a branch that `expanded` opened, with no click', async () => {
    const loader = vi.fn(() => Promise.resolve(CHILDREN));
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.loader.set(loader);
    fixture.componentInstance.expanded.set(['remote']);
    await settle();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
  });

  it('shows an error row with a retry when the loader fails, and loads again from it', async () => {
    let fail = true;
    const loader = vi.fn(() => (fail ? Promise.reject(new Error('offline')) : Promise.resolve(CHILDREN)));
    mount(loader);

    toggle('Remote');
    await settle();

    expect(status()!.classList).toContain('wr-tree__status--error');
    expect(status()!.querySelector('.wr-tree__status-text')!.textContent.trim()).toBe('Could not load');
    const retry = status()!.querySelector<HTMLButtonElement>('button.wr-tree__retry')!;
    expect(retry.textContent.trim()).toBe('Try again');
    expect(row('Remote').hasAttribute('aria-busy')).toBe(false);

    fail = false;
    retry.click();
    await settle();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(status()).toBeNull();
    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
  });

  it('retries from the keyboard: Enter on the error row', async () => {
    let fail = true;
    const loader = vi.fn(() => (fail ? Promise.reject(new Error('offline')) : Promise.resolve(CHILDREN)));
    mount(loader);
    toggle('Remote');
    await settle();

    const list = root().querySelector<HTMLElement>('.wr-tree__list')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle();
    expect(status()!.getAttribute('tabindex')).toBe('0');

    fail = false;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
  });

  it('treats a loader that throws as a failed load', async () => {
    mount(() => {
      throw new Error('boom');
    });

    toggle('Remote');
    await settle();

    expect(status()!.classList).toContain('wr-tree__status--error');
  });

  it('accepts an Observable and takes its first value', async () => {
    const source = new Subject<readonly WrTreeNode[]>();
    mount(() => source);
    toggle('Remote');
    render();
    expect(status()).not.toBeNull();

    source.next(CHILDREN);
    await settle();

    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
    expect(source.observed).toBe(false);
  });

  it('accepts a plain array, and a synchronous Observable', async () => {
    mount(() => CHILDREN);
    toggle('Remote');
    await settle();
    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
    fixture.destroy();

    mount(() => of(CHILDREN));
    toggle('Remote');
    await settle();
    expect(labels()).toEqual(['Remote', 'One', 'Two', 'Local']);
  });

  it('turns a branch that loaded nothing into a leaf', async () => {
    mount(() => Promise.resolve([]));

    toggle('Remote');
    await settle();

    expect(row('Remote').hasAttribute('aria-expanded')).toBe(false);
    expect(status()).toBeNull();
  });
});
