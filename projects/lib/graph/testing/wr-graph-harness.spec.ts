import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrGraph, type WrGraphEdge, type WrGraphNode, WrGraphNodeTemplate } from 'ngwr/graph';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGraphHarness } from './wr-graph-harness';
import { WrGraphNodeHarness } from './wr-graph-node-harness';

/**
 * A root with two children that share one grandchild, which has two parallel edges to
 * a leaf — plus one node with no edges at all, which is the node that has nothing to
 * announce.
 */
const NODES: readonly WrGraphNode[] = [
  { id: 'atlas', label: 'Atlas' },
  { id: 'birch', label: 'Birch' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'dune', label: 'Dune' },
  { id: 'ember', label: 'Ember' },
  { id: 'fern', label: 'Fern' },
];

const EDGES: readonly WrGraphEdge[] = [
  { from: 'atlas', to: 'birch' },
  { from: 'atlas', to: 'cedar' },
  { from: 'birch', to: 'dune' },
  { from: 'cedar', to: 'dune' },
  { from: 'dune', to: 'ember' },
  { from: 'dune', to: 'ember' },
];

@Component({
  imports: [WrGraph],
  template: `<wr-graph [nodes]="nodes()" [edges]="edges()" [ariaLabel]="label()" />`,
})
class Host {
  readonly nodes = signal<readonly WrGraphNode[]>(NODES);
  readonly edges = signal<readonly WrGraphEdge[]>(EDGES);
  readonly label = signal<string | null>(null);
}

@Component({
  imports: [WrGraph, WrGraphNodeTemplate],
  template: `
    <wr-graph [nodes]="nodes" [edges]="edges" ariaLabel="Crew">
      <ng-template wrGraphNode let-node>
        <span class="crew">{{ node.label }}, {{ node.data?.role }}</span>
      </ng-template>
    </wr-graph>
  `,
})
class TemplateHost {
  readonly nodes: readonly WrGraphNode<{ role: string }>[] = [
    { id: 'lead', label: 'Mira Vale', data: { role: 'Lead' } },
    { id: 'dev', label: 'Oren Pike', data: { role: 'Engineer' } },
  ];
  readonly edges: readonly WrGraphEdge[] = [{ from: 'lead', to: 'dev' }];
}

/** Two graphs side by side, with different data — the setup that catches one answering for the other. */
@Component({
  imports: [WrGraph],
  template: `
    <wr-graph [nodes]="rivers" [edges]="riverEdges" ariaLabel="Rivers" />
    <wr-graph [nodes]="peaks" [edges]="peakEdges" ariaLabel="Peaks" />
  `,
})
class TwoGraphsHost {
  readonly rivers: readonly WrGraphNode[] = [
    { id: 'source', label: 'Source' },
    { id: 'delta', label: 'Delta' },
  ];
  readonly riverEdges: readonly WrGraphEdge[] = [{ from: 'source', to: 'delta' }];
  readonly peaks: readonly WrGraphNode[] = [
    { id: 'summit', label: 'Summit' },
    { id: 'ridge', label: 'Ridge' },
    { id: 'saddle', label: 'Saddle' },
  ];
  readonly peakEdges: readonly WrGraphEdge[] = [
    { from: 'summit', to: 'ridge' },
    { from: 'summit', to: 'saddle' },
  ];
}

/** A graph drawn inside every node of another — the case a descendant query gets wrong. */
@Component({
  imports: [WrGraph, WrGraphNodeTemplate],
  template: `
    <wr-graph [nodes]="outer" [edges]="outerEdges" ariaLabel="Outer">
      <ng-template wrGraphNode let-node>
        {{ node.label }}
        <wr-graph [nodes]="inner" [edges]="innerEdges" ariaLabel="Inner" />
      </ng-template>
    </wr-graph>
  `,
})
class NestedHost {
  readonly outer: readonly WrGraphNode[] = [
    { id: 'harbor', label: 'Harbor' },
    { id: 'quay', label: 'Quay' },
  ];
  readonly outerEdges: readonly WrGraphEdge[] = [{ from: 'harbor', to: 'quay' }];
  readonly inner: readonly WrGraphNode[] = [
    { id: 'kestrel', label: 'Kestrel' },
    { id: 'lark', label: 'Lark' },
    { id: 'wren', label: 'Wren' },
  ];
  readonly innerEdges: readonly WrGraphEdge[] = [
    { from: 'kestrel', to: 'lark' },
    { from: 'lark', to: 'wren' },
  ];
}

const texts = (nodes: WrGraphNodeHarness[]): Promise<string[]> => Promise.all(nodes.map(node => node.getText()));

/**
 * Used exactly as a consumer would: through the loader, with nothing reached into past
 * the public classes and attributes the harness documents. The layout's coordinates
 * are pinned in its own pure spec, so nothing here depends on where a node lands —
 * only on what it draws, what it announces and which ids its lines join.
 */
describe('WrGraphHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the viewport’s name, the fallback and a bound one', async () => {
    const graph = await loader.getHarness(WrGraphHarness);
    expect(await graph.getAccessibleName()).toBe('Graph');

    fixture.componentInstance.label.set('Team structure');
    await fixture.whenStable();

    expect(await graph.getAccessibleName()).toBe('Team structure');
  });

  it('lists every node, parents before children', async () => {
    const graph = await loader.getHarness(WrGraphHarness);
    const drawn = await texts(await graph.getNodes());

    expect([...drawn].sort()).toEqual(['Atlas', 'Birch', 'Cedar', 'Dune', 'Ember', 'Fern']);
    // Reading order is layer first, so each generation comes after the one above it —
    // whatever the layout decides about positions inside a layer.
    const at = (label: string): number => drawn.indexOf(label);
    expect(at('Atlas')).toBeLessThan(at('Birch'));
    expect(at('Birch')).toBeLessThan(at('Dune'));
    expect(at('Cedar')).toBeLessThan(at('Dune'));
    expect(at('Dune')).toBeLessThan(at('Ember'));
  });

  it('narrows nodes by label, as a string or a RegExp', async () => {
    const graph = await loader.getHarness(WrGraphHarness);

    expect(await texts(await graph.getNodes({ label: 'Dune' }))).toEqual(['Dune']);
    expect((await texts(await graph.getNodes({ label: /^[BC]/ }))).sort()).toEqual(['Birch', 'Cedar']);
    // The relation sentence is not part of the drawn text, so nothing it says can make a node
    // match. Asked with a RegExp, because a string is exact and `'Parents'` would miss
    // `BirchParents: Atlas…` just as well — five of these six nodes carry a sentence.
    expect(await graph.getNodes({ label: /Parents|Children/ })).toEqual([]);
  });

  it('keeps what a node draws apart from what it announces', async () => {
    const graph = await loader.getHarness(WrGraphHarness);
    const birch = await graph.getNode({ label: 'Birch' });

    // Both are text inside one block. Read together they would be `BirchParents: Atlas…`,
    // and a spec on that would pass on a graph naming the wrong neighbours.
    expect(await birch.getText()).toBe('Birch');
    expect(await birch.getRelationText()).toBe('Parents: Atlas. Children: Dune.');
    expect(await (await graph.getNode({ label: 'Ember' })).getRelationText()).toBe('Parents: Dune.');
  });

  it('answers null for a node with no edges, which has no sentence at all', async () => {
    const graph = await loader.getHarness(WrGraphHarness);
    const fern = await graph.getNode({ label: 'Fern' });

    expect(await fern.getText()).toBe('Fern');
    expect(await fern.getRelationText()).toBeNull();
  });

  it('reads the edges as ids, in the order given, parallel ones included', async () => {
    const graph = await loader.getHarness(WrGraphHarness);

    expect(await graph.getEdges()).toEqual([
      { from: 'atlas', to: 'birch' },
      { from: 'atlas', to: 'cedar' },
      { from: 'birch', to: 'dune' },
      { from: 'cedar', to: 'dune' },
      { from: 'dune', to: 'ember' },
      { from: 'dune', to: 'ember' },
    ]);
  });

  it('follows the data when the host changes it', async () => {
    const graph = await loader.getHarness(WrGraphHarness);

    fixture.componentInstance.nodes.set([
      { id: 'atlas', label: 'Atlas' },
      { id: 'birch', label: 'Birch' },
    ]);
    fixture.componentInstance.edges.set([{ from: 'birch', to: 'atlas' }]);
    await fixture.whenStable();

    expect(await graph.getEdges()).toEqual([{ from: 'birch', to: 'atlas' }]);
    expect(await (await graph.getNode({ label: 'Atlas' })).getRelationText()).toBe('Parents: Birch.');
  });

  it('says what the graph draws when a label matched nothing', async () => {
    const graph = await loader.getHarness(WrGraphHarness);

    await expect(graph.getNode({ label: 'Gorse' })).rejects.toThrow('no node matched { label: "Gorse" }.');
    await expect(graph.getNode({ label: 'Gorse' })).rejects.toThrow(/Atlas/);
  });

  it('shows a RegExp label as the literal it was, in either failure', async () => {
    const graph = await loader.getHarness(WrGraphHarness);

    // JSON would print a RegExp as `{}` — and then advise the caller to use a RegExp.
    await expect(graph.getNode({ label: /^Gorse$/i })).rejects.toThrow(
      'no node matched { label: /^Gorse$/i }. The graph draws'
    );

    fixture.componentInstance.nodes.set([]);
    fixture.componentInstance.edges.set([]);
    await fixture.whenStable();

    await expect(graph.getNode({ label: /^Atlas/ })).rejects.toThrow(
      'no node matched { label: /^Atlas/ } because the graph draws no nodes'
    );
  });

  it('answers [] for the nodes of an empty graph, and refuses to list its edges', async () => {
    fixture.componentInstance.nodes.set([]);
    fixture.componentInstance.edges.set([]);
    await fixture.whenStable();
    const graph = await loader.getHarness(WrGraphHarness);

    expect(await graph.getNodes()).toEqual([]);
    // "No edges" is vacuously true of a graph that drew nothing — and the DOM of an empty
    // graph is the DOM of a layout that failed, so the harness will not say it.
    await expect(graph.getEdges()).rejects.toThrow(/draws no nodes, so an empty edge list would be vacuously true/);
    await expect(graph.getNode({ label: 'Atlas' })).rejects.toThrow(/draws no nodes at all/);
  });
});

describe('WrGraphNodeHarness with a node template', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TemplateHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads what the template drew, and still the sentence apart from it', async () => {
    const graph = await loader.getHarness(WrGraphHarness);
    const [lead, dev] = await graph.getNodes();

    // Everything the template drew, not the label alone — and still without the sentence.
    expect(await lead.getText()).toBe('Mira Vale, Lead');
    expect(await lead.getRelationText()).toBe('Children: Oren Pike.');
    expect(await dev.getText()).toBe('Oren Pike, Engineer');
    expect(await dev.getRelationText()).toBe('Parents: Mira Vale.');
  });

  it('matches a template’s text with a RegExp, and not with the bare label', async () => {
    const graph = await loader.getHarness(WrGraphHarness);

    expect(await texts(await graph.getNodes({ label: /^Oren Pike/ }))).toEqual(['Oren Pike, Engineer']);
    await expect(graph.getNode({ label: 'Oren Pike' })).rejects.toThrow(/needs a RegExp/);
  });

  it('loads a node straight from the fixture as well', async () => {
    const node = await loader.getHarness(WrGraphNodeHarness.with({ label: /Lead$/ }));

    expect(await node.getRelationText()).toBe('Children: Oren Pike.');
  });
});

describe('WrGraphHarness with two graphs on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoGraphsHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoGraphsHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by name and by a node it draws', async () => {
    const byName = await loader.getHarness(WrGraphHarness.with({ ariaLabel: 'Peaks' }));
    const byNode = await loader.getHarness(WrGraphHarness.with({ nodeLabel: 'Delta' }));

    expect(await byName.getEdges()).toEqual([
      { from: 'summit', to: 'ridge' },
      { from: 'summit', to: 'saddle' },
    ]);
    expect(await byNode.getAccessibleName()).toBe('Rivers');
    expect(await loader.getAllHarnesses(WrGraphHarness.with({ nodeLabel: /^S/ }))).toHaveLength(2);
  });

  it('never answers for its neighbour', async () => {
    const [rivers, peaks] = await loader.getAllHarnesses(WrGraphHarness);

    expect((await texts(await rivers.getNodes())).sort()).toEqual(['Delta', 'Source']);
    expect((await texts(await peaks.getNodes())).sort()).toEqual(['Ridge', 'Saddle', 'Summit']);
    expect(await rivers.getEdges()).toEqual([{ from: 'source', to: 'delta' }]);
    await expect(rivers.getNode({ label: 'Ridge' })).rejects.toThrow(/no node matched/);
  });
});

describe('WrGraphHarness with a graph inside a node template', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NestedHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('counts only its own nodes and lines, not the ones its templates drew', async () => {
    const outer = await loader.getHarness(WrGraphHarness.with({ ariaLabel: 'Outer' }));

    // Every outer node holds a three-node graph with two lines. A descendant query would
    // answer eight nodes and five edges here.
    expect(await outer.getNodes()).toHaveLength(2);
    expect(await outer.getEdges()).toEqual([{ from: 'harbor', to: 'quay' }]);
    expect(await loader.getAllHarnesses(WrGraphHarness.with({ ariaLabel: 'Inner' }))).toHaveLength(2);
  });

  it('reads a node’s own sentence and text, not the nested graph’s', async () => {
    const outer = await loader.getHarness(WrGraphHarness.with({ ariaLabel: 'Outer' }));
    const harbor = await outer.getNode({ label: 'Harbor' });

    // The inner graph's sentences come first in the DOM, inside the template.
    expect(await harbor.getRelationText()).toBe('Children: Quay.');
    // And its cards are its own nodes, not text the outer node drew.
    expect(await harbor.getText()).toBe('Harbor');
    expect(await outer.getNodes({ label: /Kestrel|Lark|Wren/ })).toEqual([]);
  });

  it('narrows by node label without reaching into a nested graph', async () => {
    expect(await loader.getAllHarnesses(WrGraphHarness.with({ nodeLabel: 'Lark' }))).toHaveLength(2);
    // A string is exact, so it could never have matched the outer graph. A RegExp is the
    // question that can: only the two inner graphs draw a Lark.
    const larks = await loader.getAllHarnesses(WrGraphHarness.with({ nodeLabel: /Lark/ }));
    expect(await Promise.all(larks.map(graph => graph.getAccessibleName()))).toEqual(['Inner', 'Inner']);
    expect(await (await loader.getHarness(WrGraphHarness.with({ nodeLabel: 'Harbor' }))).getAccessibleName()).toBe(
      'Outer'
    );
  });
});
