import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrTree, type WrTreeNode, type WrTreeSelectionMode } from 'ngwr/tree';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTreeHarness } from './wr-tree-harness';

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
  readonly picked = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly selectionMode = signal<WrTreeSelectionMode>('single');
  readonly disabled = signal(false);
}

@Component({
  imports: [WrTree],
  template: `
    <wr-tree openOn="overlay" [nodes]="nodes" [(value)]="picked" [disabled]="disabled()" placeholder="Pick a file" />
  `,
})
class OverlayHost {
  readonly nodes = NODES;
  readonly picked = signal<unknown>(undefined);
  readonly disabled = signal(false);
}

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      openOn="overlay"
      selectionMode="multi"
      [nodes]="nodes"
      [maxTagCount]="maxTagCount()"
      [(selected)]="picked"
      placeholder="Pick files"
    />
  `,
})
class OverlayMultiHost {
  readonly nodes = NODES;
  readonly maxTagCount = signal(0);
  readonly picked = signal<readonly string[]>([]);
}

@Component({
  imports: [WrTree],
  template: `<wr-tree [nodes]="nodes()" virtualScroll [viewportHeight]="100" [(selected)]="picked" />`,
})
class VirtualHost {
  readonly nodes = signal<readonly WrTreeNode[]>(
    Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, label: `Node ${i + 1}` }))
  );
  readonly picked = signal<readonly string[]>([]);
}

@Component({
  imports: [WrTree],
  template: `
    <wr-tree openOn="overlay" selectionMode="multi" [nodes]="fruit" placeholder="Fruit" />
    <wr-tree openOn="overlay" [nodes]="veg" placeholder="Veg" />
  `,
})
class TwoHost {
  readonly fruit: readonly WrTreeNode[] = [{ id: 'apple', label: 'Apple' }];
  readonly veg: readonly WrTreeNode[] = [{ id: 'carrot', label: 'Carrot' }];
}

@Component({
  imports: [WrTree],
  template: `
    <wr-tree [nodes]="first" />
    <wr-tree selectionMode="multi" [nodes]="second" />
  `,
})
class TwoInlineHost {
  readonly first: readonly WrTreeNode[] = [
    { id: 'a1', label: 'First A' },
    { id: 'a2', label: 'First B' },
  ];
  readonly second: readonly WrTreeNode[] = [
    { id: 'b1', label: 'Second A' },
    { id: 'b2', label: 'Second B' },
  ];
}

@Component({
  imports: [WrTree],
  template: `
    <wr-tree selectionMode="multi" [nodes]="inline" />
    <wr-tree openOn="overlay" [nodes]="popup" placeholder="Popup" />
  `,
})
class MixedHost {
  readonly inline: readonly WrTreeNode[] = [{ id: 'page', label: 'In the page' }];
  readonly popup: readonly WrTreeNode[] = [{ id: 'panel', label: 'In the panel' }];
}

/**
 * A tree is ONE tab stop with a cursor inside it, and everything about its shape that
 * reaches a screen reader is on the rows: the rendered list is flat, with no
 * `role="group"`, so `aria-level` / `aria-posinset` / `aria-setsize` are the only place
 * the hierarchy exists. This block is the inline shape, where the rows are in the
 * fixture; the overlay shape and the windowed one follow.
 */
describe('WrTreeHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let tree: WrTreeHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    tree = await loader.getHarness(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('reads the visible nodes in order, and announces itself as a tree', async () => {
    expect(await tree.getRole()).toBe('tree');
    expect(await tree.isOverlay()).toBe(false);
    // An inline tree has nothing to open: its rows are part of the host.
    expect(await tree.isOpen()).toBe(true);
    expect(await tree.getNodeLabels()).toEqual(['src', 'README.md', 'node_modules']);
  });

  it('says which rows are branches, and leaves the leaves alone', async () => {
    const [src, readme] = await tree.getNodes();

    // A branch with no `aria-expanded` announces as a leaf and the user never learns
    // there is anything under it.
    expect(await src.isExpandable()).toBe(true);
    expect(await src.isExpanded()).toBe(false);
    expect(await readme.isExpandable()).toBe(false);
  });

  it('opens a branch and deepens the level of what appears', async () => {
    await (await tree.getNode({ label: 'src' })).expand();

    expect(await tree.getNodeLabels()).toEqual(['src', 'app', 'styles.css', 'README.md', 'node_modules']);
    expect(await (await tree.getNode({ label: 'src' })).isExpanded()).toBe(true);
    expect(await (await tree.getNode({ label: 'app' })).getLevel()).toBe(2);
  });

  it('closes it again, and leaves an already-closed branch alone', async () => {
    const src = await tree.getNode({ label: 'src' });
    await src.expand();
    await src.collapse();

    expect(await tree.getNodeLabels()).toEqual(['src', 'README.md', 'node_modules']);

    await src.collapse();
    expect(await src.isExpanded()).toBe(false);

    // The raw flip, for a spec that means the click rather than the intent.
    await src.toggleExpand();
    expect(await src.isExpanded()).toBe(true);
  });

  it('refuses to open or close a leaf', async () => {
    const readme = await tree.getNode({ label: 'README.md' });

    // The leaf renders a `<span>` with the toggle's own class to hold the indent, so a
    // harness that clicked "the toggle" would resolve quietly having done nothing.
    await expect(readme.expand()).rejects.toThrow(/"README\.md" is a leaf/);
    await expect(readme.collapse()).rejects.toThrow(/is a leaf/);
    await expect(readme.toggleExpand()).rejects.toThrow(/is a leaf/);
  });

  it('counts a node within its sibling group, not within the flat list', async () => {
    await (await tree.getNode({ label: 'src' })).expand();
    const app = await tree.getNode({ label: 'app' });

    // `app` is the 1st of `src`'s 2 children even though it is the 2nd row on screen.
    // That is what ARIA asks for, and it is the whole reason the attributes are needed
    // when the DOM cannot express the nesting.
    expect([await app.getPosInSet(), await app.getSetSize()]).toEqual([1, 2]);

    const readme = await tree.getNode({ label: 'README.md' });
    expect([await readme.getPosInSet(), await readme.getSetSize()]).toEqual([2, 3]);
  });

  it('places every row in the visible list', async () => {
    await (await tree.getNode({ label: 'src' })).expand();

    const indices = await Promise.all((await tree.getNodes()).map(node => node.getIndex()));
    expect(indices).toEqual([0, 1, 2, 3, 4]);
  });

  it('selects a node and reports it back', async () => {
    expect(await tree.getSelectionMode()).toBe('single');

    await tree.selectNode({ label: 'README.md' });

    expect(fixture.componentInstance.picked()).toEqual(['readme']);
    expect(await tree.getSelectedLabels()).toEqual(['README.md']);
    expect(await (await tree.getNode({ label: 'README.md' })).isSelected()).toBe(true);
  });

  it('replaces the selection on a plain click, even in multi mode', async () => {
    fixture.componentInstance.selectionMode.set('multi');
    fixture.detectChanges();

    expect(await tree.isMultiple()).toBe(true);
    expect(await tree.getSelectionMode()).toBe('multi');

    await tree.selectNode({ label: 'src' });
    await tree.selectNode({ label: 'README.md' });

    // The component's own choice, and the surprise worth pinning: a plain click in
    // multi mode starts the selection over. Accumulating one takes Ctrl.
    expect(await tree.getSelectedLabels()).toEqual(['README.md']);
  });

  it('accumulates a selection with ctrl-click', async () => {
    fixture.componentInstance.selectionMode.set('multi');
    fixture.detectChanges();

    await tree.selectNode({ label: 'src' }, { additive: true });
    await tree.selectNode({ label: 'README.md' }, { additive: true });

    expect(fixture.componentInstance.picked()).toEqual(['src', 'readme']);
    expect(await tree.getSelectedLabels()).toEqual(['src', 'README.md']);

    // Ctrl-clicking a selected node takes it back out.
    await (await tree.getNode({ label: 'src' })).ctrlClick();
    expect(await tree.getSelectedLabels()).toEqual(['README.md']);
  });

  it('tells an unselectable tree from an unselected node', async () => {
    fixture.componentInstance.selectionMode.set('none');
    fixture.detectChanges();

    const readme = await tree.getNode({ label: 'README.md' });

    // `selectionMode="none"` is the ABSENCE of `aria-selected`, not a `false` — the two
    // look identical on screen and a spec cannot tell them apart any other way.
    expect(await readme.isSelectable()).toBe(false);
    expect(await readme.isSelected()).toBe(false);
    expect(await tree.getSelectionMode()).toBe('none');

    await expect(tree.selectNode({ label: 'README.md' })).rejects.toThrow(/selectionMode="none"/);
  });

  it('answers from what the row announces, not from how it is painted', async () => {
    // The two DIVERGE, and only in this direction: `selectionMode="none"` drops
    // `aria-selected` while the `--selected` modifier still follows the `[(selected)]`
    // model, so a row can look picked while announcing nothing at all. A harness reading
    // the class would report a selection no screen reader is told about.
    fixture.componentInstance.selectionMode.set('none');
    fixture.componentInstance.picked.set(['readme']);
    fixture.detectChanges();

    const row = (fixture.nativeElement as HTMLElement).querySelectorAll('.wr-tree__row')[1];
    expect(row.classList.contains('wr-tree__row--selected')).toBe(true);
    expect(row.hasAttribute('aria-selected')).toBe(false);

    const readme = await tree.getNode({ label: 'README.md' });
    expect(await readme.isSelected()).toBe(false);
    expect(await readme.isSelectable()).toBe(false);
    expect(await tree.getSelectedLabels()).toEqual([]);
  });

  it('refuses to select a disabled node, and proves the tree ignores the click', async () => {
    const locked = await tree.getNode({ label: 'node_modules' });
    expect(await locked.isDisabled()).toBe(true);

    await expect(tree.selectNode({ label: 'node_modules' })).rejects.toThrow(/is disabled/);

    // The raw click is the escape hatch for proving exactly that.
    await locked.click();
    expect(fixture.componentInstance.picked()).toEqual([]);
  });

  it('marks every node disabled when the whole tree is', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(await tree.isDisabled()).toBe(true);
    const states = await Promise.all((await tree.getNodes()).map(node => node.isDisabled()));
    expect(states).toEqual([true, true, true]);

    // And the toggle stops working, rather than the harness reporting a branch that
    // opened when it did not.
    await expect((await tree.getNode({ label: 'src' })).expand()).rejects.toThrow(/did not open/);
  });

  it('opens every branch level by level', async () => {
    await tree.expandAll();

    expect(await tree.getNodeLabels()).toEqual(['src', 'app', 'main.ts', 'styles.css', 'README.md', 'node_modules']);
  });

  it('narrows nodes by label, level, state and disabled-ness', async () => {
    await (await tree.getNode({ label: 'src' })).expand();
    await tree.selectNode({ label: 'styles.css' });

    const byLevel = await tree.getNodes({ level: 2 });
    const bySelected = await tree.getNodes({ selected: true });
    const byDisabled = await tree.getNodes({ disabled: true });
    const byLabel = await tree.getNodes({ label: /^main/ });

    expect(await Promise.all(byLevel.map(n => n.getLabel()))).toEqual(['app', 'styles.css']);
    expect(await Promise.all(bySelected.map(n => n.getLabel()))).toEqual(['styles.css']);
    expect(await Promise.all(byDisabled.map(n => n.getLabel()))).toEqual(['node_modules']);
    // `main.ts` is inside the closed `app` branch, so it is not rendered at all.
    expect(byLabel).toHaveLength(0);

    // `getNode` answers with the FIRST match in row order, not just any one of them —
    // three rows sit at level 1 here.
    expect(await (await tree.getNode({ level: 1 })).getLabel()).toBe('src');
  });

  it('treats a leaf as neither open nor closed', async () => {
    const closed = await tree.getNodes({ expanded: false });
    expect(await Promise.all(closed.map(n => n.getLabel()))).toEqual(['src']);

    await (await tree.getNode({ label: 'src' })).expand();

    const open = await tree.getNodes({ expanded: true });
    expect(await Promise.all(open.map(n => n.getLabel()))).toEqual(['src']);
    // `README.md` and `node_modules` are leaves: `{ expanded: false }` means "a branch
    // waiting to be opened", which is what makes expandAll() terminate.
    expect(await Promise.all((await tree.getNodes({ expanded: false })).map(n => n.getLabel()))).toEqual(['app']);
  });

  it('says what it is showing when a node cannot be found', async () => {
    await expect(tree.getNode({ label: 'main.ts' })).rejects.toThrow(/src, README\.md, node_modules/);
  });

  it('narrows the tree itself by a node it is showing, and by disabled-ness', async () => {
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ nodeLabel: 'src' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ nodeLabel: 'main.ts' }))).toHaveLength(0);
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ disabled: true }))).toHaveLength(0);
    // An inline tree is always open, so it matches `{ open: true }` and nothing else.
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ open: true }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ open: false }))).toHaveLength(0);

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ disabled: true }))).toHaveLength(1);
  });

  it('refuses trigger questions an inline tree cannot answer', async () => {
    // Answering `''` / `[]` here would let a spec assert a selection that the trigger
    // it thinks it is reading does not exist.
    await expect(tree.getValueText()).rejects.toThrow(/renders inline/);
    await expect(tree.getChipLabels()).rejects.toThrow(/renders inline/);
    await expect(tree.getPlaceholder()).rejects.toThrow(/renders inline/);
    await expect(tree.getOverflowText()).rejects.toThrow(/renders inline/);
    await expect(tree.clear()).rejects.toThrow(/renders inline/);
    await expect(tree.close()).rejects.toThrow(/renders inline/);
  });

  it('reports no windowing, and no selection mode, for a tree with nothing in it', async () => {
    fixture.componentInstance.nodes.set([]);
    fixture.detectChanges();

    expect(await tree.isVirtual()).toBe(false);
    expect(await tree.getNodes()).toHaveLength(0);
    await expect(tree.getSelectionMode()).rejects.toThrow(/renders no nodes/);
  });
});

/**
 * The keyboard is the whole interaction model here — one tab stop, a cursor inside it —
 * and in a unit test it is also the only one available: jsdom lays nothing out, so a
 * pointer gesture that needs a coordinate has nothing to aim at.
 */
describe('WrTreeHarness — keyboard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let tree: WrTreeHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    tree = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('walks the cursor down, up, and to either end', async () => {
    expect(await tree.getActiveNodeLabel()).toBe('src');

    await tree.focusNext();
    expect(await tree.getActiveNodeLabel()).toBe('README.md');

    await tree.focusLast();
    expect(await tree.getActiveNodeLabel()).toBe('node_modules');

    await tree.focusPrevious();
    expect(await tree.getActiveNodeLabel()).toBe('README.md');

    await tree.focusFirst();
    expect(await tree.getActiveNodeLabel()).toBe('src');
  });

  it('keeps the tree to a single tab stop, and moves real focus with the cursor', async () => {
    await (await tree.getNode({ label: 'src' })).expand();
    await tree.focusNext();

    const nodes = await tree.getNodes();
    const active = await Promise.all(nodes.map(node => node.isActive()));

    // Tabbing through a hundred-node tree must not mean a hundred tab stops: the cursor
    // row holds the only `tabindex="0"`, and this shape puts real focus there too.
    expect(active).toEqual([false, true, false, false, false]);
    expect(await nodes[1].isFocused()).toBe(true);
  });

  it('opens a branch with ArrowRight, then steps into it', async () => {
    await tree.expandActive();

    expect(await (await tree.getNode({ label: 'src' })).isExpanded()).toBe(true);
    expect(await tree.getActiveNodeLabel()).toBe('src');

    // The APG's one key with two jobs: an already-open branch hands the cursor to its
    // first child instead.
    await tree.expandActive();
    expect(await tree.getActiveNodeLabel()).toBe('app');
  });

  it('steps out to the parent with ArrowLeft, then closes it', async () => {
    await tree.expandActive();
    await tree.expandActive();
    expect(await tree.getActiveNodeLabel()).toBe('app');

    // `app` is a CLOSED branch, so ArrowLeft leaves it alone and walks out to `src`.
    await tree.collapseActive();
    expect(await tree.getActiveNodeLabel()).toBe('src');
    expect(await (await tree.getNode({ label: 'app' })).isExpanded()).toBe(false);

    await tree.collapseActive();
    expect(await tree.getNodeLabels()).toEqual(['src', 'README.md', 'node_modules']);
  });

  it('selects the cursor row with Enter, and adds to the selection with Ctrl-Enter', async () => {
    fixture.componentInstance.selectionMode.set('multi');
    fixture.detectChanges();

    await tree.selectActive();
    expect(fixture.componentInstance.picked()).toEqual(['src']);

    await tree.focusNext();
    await tree.selectActive({ additive: true });

    expect(fixture.componentInstance.picked()).toEqual(['src', 'readme']);
    expect(await tree.getSelectedLabels()).toEqual(['src', 'README.md']);
  });

  it('lets the cursor land on a disabled row but takes no selection from it', async () => {
    await tree.focusLast();

    // The cursor is allowed to rest there — a row you cannot reach is a row you cannot
    // be told about — and Enter simply does nothing.
    expect(await tree.getActiveNodeLabel()).toBe('node_modules');
    await tree.selectActive();
    expect(fixture.componentInstance.picked()).toEqual([]);
  });
});

/**
 * `openOn="overlay"` turns the same component into a combobox whose rows live in a
 * template portal in the SHARED overlay container — not inside the host. Every row this
 * block reads therefore comes through the document root, scoped by the id the trigger
 * publishes as `aria-controls`. `provideWrOverlay()` keeps the container out of the next
 * spec file's.
 */
describe('WrTreeHarness — overlay combobox', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OverlayHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let tree: WrTreeHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(OverlayHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    tree = await loader.getHarness(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('starts closed, showing its placeholder and no rows anywhere', async () => {
    expect(await tree.isOverlay()).toBe(true);
    expect(await tree.isOpen()).toBe(false);
    expect(await tree.getPlaceholder()).toBe('Pick a file');
    expect(await tree.getValueText()).toBe('');

    // A silent empty list would read like a tree that rendered nothing.
    await expect(tree.getNodes()).rejects.toThrow(/panel is closed/);
    await expect(tree.getNodeLabels()).rejects.toThrow(/panel is closed/);
  });

  it('opens the panel into the overlay container, not into the host', async () => {
    await tree.open();

    expect(await tree.isOpen()).toBe(true);
    expect(await tree.getRole()).toBe('tree');
    expect(await tree.getNodeLabels()).toEqual(['src', 'README.md', 'node_modules']);

    // The point of the scoped lookup: there is nothing to find inside the fixture.
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('[role="treeitem"]')).toHaveLength(0);
    expect(document.querySelectorAll('[role="treeitem"]')).toHaveLength(3);
  });

  it('picks a node, closes on the pick, and shows it on the trigger', async () => {
    await tree.selectNode({ label: 'README.md' });

    expect(fixture.componentInstance.picked()).toBe('readme');
    // Single mode closes the panel the moment something is picked.
    expect(await tree.isOpen()).toBe(false);
    expect(await tree.getValueText()).toBe('README.md');
    expect(await tree.getPlaceholder()).toBeNull();
  });

  it('closes on Escape, and leaves an already-closed tree alone', async () => {
    await tree.open();
    await tree.close();

    expect(await tree.isOpen()).toBe(false);

    await tree.close();
    expect(await tree.isOpen()).toBe(false);
  });

  it('reaches a branch inside the panel and opens it', async () => {
    await tree.open();
    await (await tree.getNode({ label: 'src' })).expand();

    expect(await tree.getNodeLabels()).toEqual(['src', 'app', 'styles.css', 'README.md', 'node_modules']);
    expect(await (await tree.getNode({ label: 'app' })).getLevel()).toBe(2);
  });

  it('refuses to open a disabled tree instead of reporting a panel that is not there', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(await tree.isDisabled()).toBe(true);
    await expect(tree.open()).rejects.toThrow(/did not open/);
  });

  it('narrows the tree by its open state and by the trigger text', async () => {
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ open: false }))).toHaveLength(1);

    await tree.selectNode({ label: 'README.md' });

    const found = await loader.getHarness(WrTreeHarness.with({ text: 'README.md' }));
    expect(await found.getValueText()).toBe('README.md');
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ text: /^src/ }))).toHaveLength(0);
  });
});

describe('WrTreeHarness — overlay multi with chips', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OverlayMultiHost>>;
  let tree: WrTreeHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(OverlayMultiHost);
    fixture.detectChanges();
    tree = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('reports multi from the host modifier while the panel is closed', async () => {
    // `aria-multiselectable` lives on the list, and the list does not exist yet — so the
    // modifier is the only answer available, and it has to be right.
    expect(await tree.isOpen()).toBe(false);
    expect(await tree.isMultiple()).toBe(true);
  });

  it('accumulates chips, and keeps the panel open while it does', async () => {
    await tree.selectNode({ label: 'src' }, { additive: true });
    await tree.selectNode({ label: 'README.md' }, { additive: true });

    expect(await tree.isOpen()).toBe(true);
    expect(await tree.getChipLabels()).toEqual(['src', 'README.md']);
    expect(await tree.getValueText()).toBe('src, README.md');
    expect(await tree.getOverflowText()).toBeNull();
    expect(await tree.getSelectedLabels()).toEqual(['src', 'README.md']);
  });

  it('collapses the rest into a +N chip once maxTagCount is reached', async () => {
    fixture.componentInstance.maxTagCount.set(1);
    fixture.detectChanges();

    await tree.selectNode({ label: 'src' }, { additive: true });
    await tree.selectNode({ label: 'README.md' }, { additive: true });

    expect(await tree.getChipLabels()).toEqual(['src']);
    expect(await tree.getOverflowText()).toBe('+1 more');
    // The collapsed one has no chip, so it has no remove control either.
    await expect(tree.removeChip('README.md')).rejects.toThrow(/no chip labelled "README\.md"/);
  });

  it('removes one chip by label, leaving the rest', async () => {
    await tree.open();
    await (await tree.getNode({ label: 'src' })).expand();

    await tree.selectNode({ label: 'src' }, { additive: true });
    await tree.selectNode({ label: 'styles.css' }, { additive: true });
    await tree.selectNode({ label: 'README.md' }, { additive: true });

    await tree.removeChip('styles.css');

    // The middle one: an off-by-one in the label/remove pairing would take a neighbour.
    expect(await tree.getChipLabels()).toEqual(['src', 'README.md']);
  });

  it('clears the whole selection, and says why there is nothing to clear', async () => {
    await expect(tree.clear()).rejects.toThrow(/no clear control/);

    await tree.selectNode({ label: 'src' }, { additive: true });
    await tree.clear();

    expect(fixture.componentInstance.picked()).toEqual([]);
    expect(await tree.getChipLabels()).toEqual([]);
  });

  it('reaches a node inside a branch it opened in the panel', async () => {
    await tree.open();
    await (await tree.getNode({ label: 'src' })).expand();
    await (await tree.getNode({ label: 'app' })).expand();

    await tree.selectNode({ label: 'main.ts' }, { additive: true });

    expect(fixture.componentInstance.picked()).toEqual(['main.ts']);
    expect(await tree.getChipLabels()).toEqual(['main.ts']);
  });
});

/**
 * `virtualScroll` windows the rows: the list holds one viewport's worth plus overscan,
 * padded by a `role="presentation"` spacer at each end, and the keyboard switches to the
 * `aria-activedescendant` pattern because the row a `tabindex` would live on may not be
 * rendered. So a harness that claimed to return "all nodes" would be lying, and these
 * cases pin what it does return instead.
 */
describe('WrTreeHarness — a windowed tree', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<VirtualHost>>;
  let tree: WrTreeHarness;
  let realScrollTo: unknown;

  const listItems = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-tree__list > li'),
  ];
  const spacers = (): HTMLElement[] => listItems().filter(li => li.classList.contains('wr-tree__spacer'));

  beforeEach(async () => {
    // Test-environment shim, not a claim about the tree: moving the cursor past the
    // window scrolls the row it is about to point at into view with `Element.scrollTo`,
    // which jsdom does not implement at all — there is no layout to scroll. Without
    // this, every such move throws a TypeError before the harness reads anything. The
    // tree's own window still moves, because it comes from a signal it writes
    // synchronously rather than from the element's scroll position.
    realScrollTo = Reflect.get(Element.prototype, 'scrollTo');
    Reflect.set(Element.prototype, 'scrollTo', () => undefined);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(VirtualHost);
    fixture.detectChanges();
    tree = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTreeHarness);
  });

  afterEach(() => {
    // Left behind, the patch would poison the next spec FILE.
    if (realScrollTo === undefined) Reflect.deleteProperty(Element.prototype, 'scrollTo');
    else Reflect.set(Element.prototype, 'scrollTo', realScrollTo);
    fixture.destroy();
  });

  it('returns the window, and leaves the spacers out of it', async () => {
    expect(await tree.isVirtual()).toBe(true);

    const nodes = await tree.getNodes();

    // The honest answer, and the documented one: only the window is in the DOM, so
    // `getNodes()` cannot mean "all 60 nodes". Nothing in the DOM carries the total —
    // `aria-setsize` counts a sibling group — so the data is where it lives.
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.length).toBeLessThan(60);
    expect(spacers().length).toBeGreaterThan(0);
    // The pads are `<li aria-hidden role="presentation">`s holding nothing. Counting them
    // would hand back a "node" with no label and no state.
    expect(nodes).toHaveLength(listItems().length - spacers().length);
    expect(await nodes[0].getLabel()).toBe('Node 1');
    expect(await nodes[0].getIndex()).toBe(0);
  });

  it('announces the cursor on the list instead of focusing a row', async () => {
    const [first] = await tree.getNodes();
    const list = (fixture.nativeElement as HTMLElement).querySelector('.wr-tree__list')!;

    expect(await tree.getActiveNodeLabel()).toBe('Node 1');
    expect(list.getAttribute('aria-activedescendant')).toBe(await first.getId());
    // The divergence this shape is built on: the row is the announced cursor, but focus
    // stays on the `role="tree"` container, because the row may be replaced under it.
    expect(await first.isActive()).toBe(true);
    expect(await first.isFocused()).toBe(false);
  });

  it('slides the window with the keyboard, which is the only way in a unit test', async () => {
    await tree.focusLast();

    const nodes = await tree.getNodes();
    const labels = await tree.getNodeLabels();

    // jsdom remembers a `scrollTop` write but fires no `scroll` event for it, so a
    // harness `scrollTo` would move the window only for a caller that also dispatched
    // the notification by hand. The tree writes its own offset when the cursor moves,
    // and the window follows in the same change detection pass — so the row
    // `aria-activedescendant` names is always present.
    expect(await nodes[nodes.length - 1].getIndex()).toBe(59);
    expect(await tree.getActiveNodeLabel()).toBe('Node 60');
    expect(labels).not.toContain('Node 1');
    expect(spacers()[0].classList.contains('wr-tree__spacer')).toBe(true);

    await tree.focusFirst();

    expect(await tree.getNodeLabels()).toContain('Node 1');
    expect(await tree.getActiveNodeLabel()).toBe('Node 1');
  });

  it('selects the cursor row from inside the window', async () => {
    await tree.focusNext();
    await tree.selectActive();

    expect(fixture.componentInstance.picked()).toEqual(['n1']);
    expect(await tree.getSelectedLabels()).toEqual(['Node 2']);
  });

  it('refuses expandAll rather than expanding only what happens to be rendered', async () => {
    await expect(tree.expandAll()).rejects.toThrow(/windowed tree renders only its window/);
  });

  it('reports no windowing when there is nothing to window', async () => {
    fixture.componentInstance.nodes.set([]);
    fixture.detectChanges();

    // `virtualScroll` is a request: with no rows the tree renders the plain shape, and a
    // harness that read the input instead of the list would claim a window that is not
    // there.
    expect(await tree.isVirtual()).toBe(false);
    expect(spacers()).toHaveLength(0);
  });
});

/**
 * The leak this file exists to prevent: two trees sharing one overlay container. A bare
 * `.wr-tree__list` / `.wr-tree__row` query from the document root answers with whichever
 * tree is first in the DOM, so both the LIST path (`getNodes`) and the SINGLE-ELEMENT
 * path (`isMultiple`, which reads the list's `aria-multiselectable`) are checked here —
 * the two are separate code paths and either can leak on its own.
 */
describe('WrTreeHarness — two trees on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const triggers = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-tree__trigger'),
  ];

  /**
   * Open `trigger`'s panel while leaving the panel that is already up standing.
   *
   * A second `open()` cannot do it: the outside-click watcher runs in the CAPTURE phase,
   * so the first panel is dismissed before the trigger's own handler opens the second —
   * and the trigger listens for `click` alone, so there is no keyboard route to swap in.
   * What survives is the gesture the component documents: an outside click is judged by
   * where the PRESS started, so a press inside the open panel and a release on the other
   * trigger keeps the first one. Two panels in one container is the state the scoping has
   * to survive, however rarely a user reaches it.
   */
  const openKeepingOpen = async (trigger: HTMLElement, openPanel: Element): Promise<void> => {
    openPanel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads only its own panel while both are open', async () => {
    const [fruit, veg] = await loader.getAllHarnesses(WrTreeHarness);
    await fruit.open();

    const fruitPanel = document.getElementById(triggers()[0].getAttribute('aria-controls')!)!;
    await openKeepingOpen(triggers()[1], fruitPanel);

    expect(await fruit.isOpen()).toBe(true);
    expect(await veg.isOpen()).toBe(true);

    // The list path.
    expect(await fruit.getNodeLabels()).toEqual(['Apple']);
    expect(await veg.getNodeLabels()).toEqual(['Carrot']);
    // The single-element path: one tree is multi and the other is not, so a query that
    // answered with the wrong list would report the wrong contract.
    expect(await fruit.isMultiple()).toBe(true);
    expect(await veg.isMultiple()).toBe(false);
  });

  it('refuses to answer for a closed tree while its neighbour is open', async () => {
    const [fruit, veg] = await loader.getAllHarnesses(WrTreeHarness);
    await veg.open();

    // The other half of the leak: an unscoped query would hand the closed tree its
    // neighbour's rows, and the spec would pass while reading the wrong widget.
    await expect(fruit.getNodes()).rejects.toThrow(/panel is closed/);
    await expect(fruit.getRole()).rejects.toThrow(/panel is closed/);
    // The closed tree still knows its own mode, from its own host modifier.
    expect(await fruit.isMultiple()).toBe(true);
  });

  it('dismisses the first panel when the second is opened by an ordinary click', async () => {
    const [fruit, veg] = await loader.getAllHarnesses(WrTreeHarness);
    await fruit.open();
    await veg.open();

    // Worth pinning because it is what `open()` documents: a click on another trigger is
    // an outside pointer event, so two panels never stack by ordinary use.
    expect(await fruit.isOpen()).toBe(false);
    expect(await veg.isOpen()).toBe(true);
  });

  it('narrows by a node only while that node is rendered', async () => {
    expect(await loader.getAllHarnesses(WrTreeHarness.with({ nodeLabel: 'Apple' }))).toHaveLength(0);

    const [fruit] = await loader.getAllHarnesses(WrTreeHarness);
    await fruit.open();

    const found = await loader.getHarness(WrTreeHarness.with({ nodeLabel: 'Apple' }));
    expect(await found.getNodeLabels()).toEqual(['Apple']);
  });
});

/**
 * Two INLINE trees, which is the leak the overlay cases cannot show: both lists sit in
 * the page, so a document-root `.wr-tree__list` query answers with the FIRST one and the
 * second tree reads — and types into — its neighbour. Only the second tree can catch it,
 * and only the single-element path (`getRole` / `isMultiple` / every key) runs through
 * that query; the node queries go through the host loader instead.
 */
describe('WrTreeHarness — two inline trees on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoInlineHost>>;
  let first: WrTreeHarness;
  let second: WrTreeHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoInlineHost);
    fixture.detectChanges();
    [first, second] = await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('reads its own list, not the one that comes first in the page', async () => {
    expect(await first.getNodeLabels()).toEqual(['First A', 'First B']);
    expect(await second.getNodeLabels()).toEqual(['Second A', 'Second B']);

    // The single-element path: the two trees disagree about multi-select, so a query that
    // answered with the first list would report the wrong contract for the second.
    expect(await first.isMultiple()).toBe(false);
    expect(await second.isMultiple()).toBe(true);
    expect(await second.getRole()).toBe('tree');
  });

  it('sends its keys to its own list', async () => {
    await second.focusNext();

    // A key aimed at the first tree's list would move that tree's cursor and leave this
    // one where it was — the same leak, in the direction that changes state.
    expect(await second.getActiveNodeLabel()).toBe('Second B');
    expect(await first.getActiveNodeLabel()).toBe('First A');
  });
});

describe('WrTreeHarness — an inline tree beside an overlay one', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MixedHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(MixedHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('keeps the two shapes out of one another', async () => {
    const [inline, popup] = await loader.getAllHarnesses(WrTreeHarness);
    await popup.open();

    // Both trees now render a `role="tree"` list, and the inline one comes FIRST in the
    // document — so an unscoped document-root query in the overlay harness would answer
    // with the page's tree, in both the list and the single-element path.
    expect(await popup.getNodeLabels()).toEqual(['In the panel']);
    expect(await inline.getNodeLabels()).toEqual(['In the page']);
    expect(await popup.isMultiple()).toBe(false);
    expect(await inline.isMultiple()).toBe(true);
  });
});
