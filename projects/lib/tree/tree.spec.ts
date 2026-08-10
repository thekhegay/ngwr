import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTreeNode, WrTreeSelectionMode } from './interfaces';
import { WrTree } from './tree';

const NODES: readonly WrTreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'app', label: 'app', children: [{ id: 'main.ts', label: 'main.ts' }] },
      { id: 'styles.css', label: 'styles.css' },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'locked', label: 'node_modules', disabled: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      [nodes]="nodes()"
      [(selected)]="picked"
      [(expanded)]="expanded"
      [selectionMode]="selectionMode()"
      [disabled]="disabled()"
    />
  `,
})
class Host {
  readonly nodes = signal(NODES);
  // Inline mode drives selection through `[(selected)]`; `[(value)]` is the
  // form-control binding and is documented as meaningful in `overlay` mode.
  readonly picked = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly selectionMode = signal<WrTreeSelectionMode>('single');
  readonly disabled = signal(false);
}

@Component({
  imports: [WrTree],
  template: `<wr-tree openOn="overlay" [nodes]="nodes()" [(value)]="picked" placeholder="Pick a file" />`,
})
class OverlayHost {
  readonly nodes = signal(NODES);
  readonly picked = signal<unknown>(undefined);
}

/**
 * A tree is ONE tab stop with a roving cursor inside it: the `role="tree"` owns
 * focus and routes the arrows, and each row carries the depth and expanded
 * state a screen reader reads out. Rendered without `aria-level` /
 * `aria-expanded` it becomes a flat list of names with no structure — identical
 * on screen, meaningless to anyone not looking at it.
 *
 * `openOn` defaults to `inline`, so the rows live in the fixture. The overlay
 * shape is a separate block at the bottom, where the panel mounts into the CDK
 * container instead.
 */
describe('WrTree', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('[role="tree"]')!;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const labels = (): string[] => rows().map(r => r.textContent.replace(/\s+/g, ' ').trim());
  const picked = (): readonly string[] => fixture.componentInstance.picked();

  const click = (index: number): void => {
    rows()[index].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  /** Expanding is the TOGGLE's job — a click on the row selects instead. */
  const toggle = (index: number): void => {
    rows()[index].querySelector<HTMLButtonElement>('.wr-tree__toggle')!.click();
    fixture.detectChanges();
  };

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    list().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a tree of the roots until something is expanded', () => {
    expect(list()).not.toBeNull();
    expect(labels()).toEqual(['src', 'README.md', 'node_modules']);
  });

  it('gives every row its depth, so the structure survives being read aloud', () => {
    expect(rows().map(r => r.getAttribute('aria-level'))).toEqual(['1', '1', '1']);
  });

  it('says which rows can expand, and leaves leaves alone', () => {
    // A parent with no `aria-expanded` announces as a leaf and the user never
    // learns there is anything under it.
    expect(rows()[0].getAttribute('aria-expanded')).toBe('false');
    expect(rows()[1].getAttribute('aria-expanded')).toBeNull();
  });

  it('expands a branch and deepens the level of what appears', () => {
    toggle(0);

    expect(labels()).toEqual(['src', 'app', 'styles.css', 'README.md', 'node_modules']);
    expect(rows()[0].getAttribute('aria-expanded')).toBe('true');
    expect(rows()[1].getAttribute('aria-level')).toBe('2');
  });

  it('collapses it again', () => {
    toggle(0);
    toggle(0);

    expect(labels()).toEqual(['src', 'README.md', 'node_modules']);
  });

  it('selects a leaf and reports it through the two-way binding', () => {
    click(1);

    expect(picked()).toEqual(['readme']);
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('marks only the selected row', () => {
    click(1);

    expect(rows().filter(r => r.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });

  it('refuses a disabled node', () => {
    click(2);

    expect(picked()).toEqual([]);
  });

  it('announces multi-select on the tree, and collects ids', () => {
    fixture.componentInstance.selectionMode.set('multi');
    fixture.detectChanges();

    expect(list().getAttribute('aria-multiselectable')).toBe('true');

    click(1);
    expect(picked()).toEqual(['readme']);
  });

  it('selects nothing at all in mode none', () => {
    fixture.componentInstance.selectionMode.set('none');
    fixture.detectChanges();

    click(1);
    expect(picked()).toEqual([]);
  });

  it('takes no selection while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    click(1);
    expect(picked()).toEqual([]);
  });

  it('keeps the tree to a single tab stop rather than one per row', () => {
    toggle(0); // expand, so there are five rows to count

    // The roving-cursor contract: tabbing through a hundred-node tree must not
    // mean a hundred tab stops.
    const tabbable = rows().filter(r => (r.getAttribute('tabindex') ?? '-1') !== '-1');
    expect(tabbable.length).toBeLessThanOrEqual(1);
  });

  it('leaves keys it does not own to the page', () => {
    expect(press('Tab').defaultPrevented).toBe(false);
  });

  it('follows a selection written from outside', () => {
    fixture.componentInstance.picked.set(['readme']);
    fixture.detectChanges();

    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });
});

describe('WrTree in overlay mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OverlayHost>>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!;
  const list = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="tree"]');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(OverlayHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents a combobox that promises a tree, and opens one', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('tree');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(list()).toBeNull();

    trigger().click();
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(list()).not.toBeNull();
  });

  it('points the trigger at the panel it opened', () => {
    trigger().click();
    fixture.detectChanges();

    const controls = trigger().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it('closes on Escape', () => {
    trigger().click();
    fixture.detectChanges();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(list()).toBeNull();
  });
});
