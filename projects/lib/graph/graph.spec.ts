import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EMPTY } from 'rxjs';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrGraph } from './graph';
import { WrGraphNodeTemplate } from './graph-node-template';
import type { WrGraphEdge, WrGraphNode } from './interfaces';
import { WrGraphLayout } from './internal/layout/types';
import type { WrGraphLayoutInput, WrGraphLayoutResult } from './internal/layout/types';

/**
 * The pattern for a component spec here: a tiny host that uses the component
 * the way a consumer would, and assertions against the RENDERED DOM — roles,
 * ARIA state and the `.wr-*` classes. Exact coordinates belong to the pure
 * layout spec; what this file reads is what the component WROTE: the inline
 * transform, the stage size and the path data.
 *
 * The graph: a root with two children that share one grandchild, which has two
 * parallel edges to a leaf.
 */
const NODES: readonly WrGraphNode[] = [
  { id: 'atlas', label: 'Atlas' },
  { id: 'birch', label: 'Birch' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'dune', label: 'Dune' },
  { id: 'ember', label: 'Ember' },
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
  template: `
    <wr-graph
      [nodes]="nodes()"
      [edges]="edges()"
      [ariaLabel]="label()"
      [nodeWidth]="nodeWidth()"
      [nodeHeight]="nodeHeight()"
    />
  `,
})
class Host {
  readonly nodes = signal<readonly WrGraphNode[]>(NODES);
  readonly edges = signal<readonly WrGraphEdge[]>(EDGES);
  readonly label = signal<string | null>(null);
  readonly nodeWidth = signal(160);
  readonly nodeHeight = signal(48);
}

@Component({
  imports: [WrGraph, WrGraphNodeTemplate],
  template: `
    <wr-graph [nodes]="nodes" [edges]="edges">
      <ng-template wrGraphNode let-node>
        <span class="person">{{ node.label }} / {{ node.data?.role }}</span>
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

@Component({
  imports: [WrGraph],
  template: `
    <wr-graph [nodes]="nodes" [edges]="edges" />
    <wr-graph [nodes]="nodes" [edges]="edges" />
  `,
})
class TwoGraphsHost {
  readonly nodes = NODES;
  readonly edges = EDGES;
}

const items = (root: ParentNode): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[role="listitem"]')];
const edgePaths = (root: ParentNode): SVGPathElement[] => [
  ...root.querySelectorAll<SVGPathElement>('path.wr-graph__edge'),
];
const cardText = (item: HTMLElement): string | undefined => item.querySelector('.wr-graph__card')?.textContent?.trim();
const relationText = (item: HTMLElement): string | null =>
  item.querySelector('.wr-graph__sr-only')?.textContent?.trim() ?? null;

const itemNamed = (root: ParentNode, label: string): HTMLElement => {
  const found = items(root).find(item => cardText(item) === label);
  if (!found) throw new Error(`no node labelled ${label}`);
  return found;
};

/** The translate the component wrote, read off the `style` ATTRIBUTE. */
const position = (item: HTMLElement): { x: number; y: number } => {
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(item.getAttribute('style') ?? '');
  if (!match) throw new Error(`no translate on ${item.outerHTML}`);
  return { x: Number(match[1]), y: Number(match[2]) };
};

/** A path's commands, each with its numbers. */
const commands = (path: SVGPathElement): { command: string; numbers: number[] }[] =>
  [...(path.getAttribute('d') ?? '').matchAll(/([MCL])([^MCL]+)/g)].map(match => ({
    command: match[1] ?? '',
    numbers: (match[2] ?? '').trim().split(/\s+/).map(Number),
  }));

/**
 * The places a path passes through: the `M` point, the end of every `C` and the
 * `L` that finishes on the node. A `C`'s first four numbers are control points.
 */
const points = (path: SVGPathElement): { x: number; y: number }[] =>
  commands(path).map(({ command, numbers }) => {
    const offset = command === 'C' ? 4 : 0;
    return { x: numbers[offset], y: numbers[offset + 1] };
  });

describe('WrGraph', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const viewport = (): HTMLElement => root().querySelector<HTMLElement>('.wr-graph__viewport')!;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('.wr-graph__nodes')!;

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('draws the whole graph in a single change-detection pass', () => {
    // A prerender gets exactly one pass. The layout is a `computed` with no DOM,
    // so everything — positions, lines and relation text — is there after it.
    expect(items(root())).toHaveLength(5);
    expect(edgePaths(root())).toHaveLength(6);
    expect(root().querySelectorAll('.wr-graph__sr-only')).toHaveLength(5);
    const stage = root().querySelector<HTMLElement>('.wr-graph__stage')!;
    expect(stage.style.width).toMatch(/^[\d.]+px$/);
    expect(parseFloat(stage.style.height)).toBeGreaterThan(0);
  });

  it('names the scroller as a keyboard-reachable group', () => {
    expect(viewport().getAttribute('role')).toBe('group');
    expect(viewport().getAttribute('tabindex')).toBe('0');
    expect(viewport().getAttribute('aria-label')).toBe('Graph');
  });

  it('takes its name from ariaLabel when one is bound', () => {
    fixture.componentInstance.label.set('Release pipeline');
    fixture.detectChanges();
    expect(viewport().getAttribute('aria-label')).toBe('Release pipeline');
  });

  it('keeps the lines out of the accessibility tree', () => {
    const svgs = root().querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
    expect(svgs[0].getAttribute('focusable')).toBe('false');
    expect(svgs[0].classList.contains('wr-graph__edges')).toBe(true);
  });

  it('draws one path per edge, parallel edges included, each naming its ends', () => {
    expect(edgePaths(root()).map(path => [path.dataset['from'], path.dataset['to']])).toEqual(
      EDGES.map(edge => [edge.from, edge.to])
    );
    for (const path of edgePaths(root())) expect(points(path).length).toBeGreaterThanOrEqual(2);
  });

  it('draws each link as curves that end on a straight lead-in under the arrowhead', () => {
    const marker = root().querySelector('marker')!;
    // A fixed user-space arrow, so the edge width can change without the arrow
    // growing past its lead-in or shrinking to a speck.
    expect(marker.getAttribute('markerUnits')).toBe('userSpaceOnUse');
    expect(marker.getAttribute('markerWidth')).toBe('6');

    // Guards the loop below: over zero paths every assertion in it would pass.
    expect(edgePaths(root())).toHaveLength(EDGES.length);
    for (const path of edgePaths(root())) {
      expect(path.getAttribute('d')).toMatch(/^M[^A-Z]+(?: C[^A-Z]+)+ L[^A-Z]+$/);

      const places = points(path);
      const bends = commands(path).filter(({ command }) => command === 'C');
      bends.forEach(({ numbers: [c1x, c1y, c2x, c2y, endX] }, i) => {
        // Both control points share the stretch's middle height and sit straight
        // below or above its own ends — which is what makes the tangents vertical.
        expect(c1x).toBe(places[i].x);
        expect(c2x).toBe(endX);
        expect(c1y).toBe(c2y);
      });
      // The lead-in is vertical and exactly one arrowhead long.
      const [beforeLast, last] = places.slice(-2);
      expect(last.x).toBe(beforeLast.x);
      expect(Math.abs(last.y - beforeLast.y)).toBe(6);
    }
  });

  it('draws a self-loop out to the side and back level, its arrow pointing at the node', () => {
    fixture.componentInstance.edges.set([...EDGES, { from: 'ember', to: 'ember' }]);
    fixture.detectChanges();

    const loop = edgePaths(root()).find(path => path.dataset['from'] === 'ember' && path.dataset['to'] === 'ember');
    if (!loop) throw new Error('no self-loop drawn');
    expect(commands(loop).map(({ command }) => command)).toEqual(['M', 'C', 'L']);
    const [
      {
        numbers: [startX, startY],
      },
      {
        numbers: [c1x, c1y, c2x, c2y, leadX, leadY],
      },
      {
        numbers: [endX, endY],
      },
    ] = commands(loop);

    // It leaves and returns on one vertical line, the start above the end.
    expect(endX).toBe(startX);
    expect(startY).toBeLessThan(endY);
    // The apex is one column further out than both ends, and each control point is
    // level with the end it belongs to, so the loop leaves and arrives horizontally.
    expect(c1x).toBe(c2x);
    expect(c1x).toBeGreaterThan(startX);
    expect(c1y).toBe(startY);
    expect(c2y).toBe(endY);
    // The lead-in comes back level and runs TOWARD the node, at most one arrowhead long.
    expect(leadY).toBe(endY);
    expect(leadX).toBeGreaterThan(endX);
    expect(leadX - endX).toBeLessThanOrEqual(8);

    // Both ends sit beside the node's right border, within its height.
    const ember = itemNamed(root(), 'Ember');
    const { x, y } = position(ember);
    expect(endX).toBeGreaterThan(x + parseFloat(ember.style.width));
    for (const at of [startY, endY]) {
      expect(at).toBeGreaterThan(y);
      expect(at).toBeLessThan(y + parseFloat(ember.style.height));
    }
  });

  it('renders the nodes as a list whose items are its direct children', () => {
    // A positioning wrapper between the two would break list ownership, which
    // axe reports as critical.
    expect(list().getAttribute('role')).toBe('list');
    const children = [...list().children] as HTMLElement[];
    expect(children).toHaveLength(5);
    for (const child of children) {
      expect(child.getAttribute('role')).toBe('listitem');
      expect(child.classList.contains('wr-graph__node')).toBe(true);
    }
  });

  it('shows the label in the default card when there is no template', () => {
    expect(items(root()).map(cardText).sort()).toEqual(['Atlas', 'Birch', 'Cedar', 'Dune', 'Ember']);
  });

  it('sizes each node from nodeWidth / nodeHeight, and a node’s own size wins', () => {
    fixture.componentInstance.nodes.set([{ id: 'atlas', label: 'Atlas', width: 220 }, ...NODES.slice(1)]);
    fixture.detectChanges();

    const atlas = itemNamed(root(), 'Atlas');
    expect(atlas.style.width).toBe('220px');
    expect(atlas.style.height).toBe('48px');
    expect(itemNamed(root(), 'Birch').style.width).toBe('160px');
  });

  it('reads in layer order, then left to right, whatever order the input came in', () => {
    fixture.componentInstance.nodes.set([...NODES].reverse());
    fixture.detectChanges();

    const read = items(root());
    expect(read.map(cardText)[0]).toBe('Atlas');
    expect(read.map(cardText)[4]).toBe('Ember');
    expect(read.map(cardText)[3]).toBe('Dune');

    const at = read.map(position);
    for (let i = 1; i < at.length; i++) {
      const sameLayer = at[i].y === at[i - 1].y;
      expect(sameLayer ? at[i].x > at[i - 1].x : at[i].y > at[i - 1].y, `item ${i}`).toBe(true);
    }
  });

  it('reads a layer by its vertical centre, so a tall node does not jump ahead of a short one beside it', () => {
    // A layer centres its nodes on one line, so the TALL node's top edge is higher.
    // Sorting by the top edge would read the right-hand tall node before the short
    // one to its left.
    fixture.componentInstance.nodes.set([
      { id: 'hub', label: 'Hub' },
      { id: 'short', label: 'Short', height: 32 },
      { id: 'tall', label: 'Tall', height: 96 },
    ]);
    fixture.componentInstance.edges.set([
      { from: 'hub', to: 'short' },
      { from: 'hub', to: 'tall' },
    ]);
    fixture.detectChanges();

    const short = position(itemNamed(root(), 'Short'));
    const tall = position(itemNamed(root(), 'Tall'));
    // The case this test exists for: left-to-right and top-edge order disagree.
    expect(short.x).toBeLessThan(tall.x);
    expect(tall.y).toBeLessThan(short.y);
    expect(short.y + 16).toBe(tall.y + 48);

    expect(items(root()).map(cardText)).toEqual(['Hub', 'Short', 'Tall']);
  });

  it('writes each node’s parents and children as names, never as a count', () => {
    expect(relationText(itemNamed(root(), 'Atlas'))).toBe('Children: Birch and Cedar.');
    expect(relationText(itemNamed(root(), 'Birch'))).toBe('Parents: Atlas. Children: Dune.');
    expect(relationText(itemNamed(root(), 'Dune'))).toBe('Parents: Birch and Cedar. Children: Ember.');
  });

  it('names neighbours in reading order, not in the order the edges were listed', () => {
    // Only Dune's two parent edges are swapped. Reversing every edge is no test: the
    // layout orders a layer by its edges too, so Cedar would move left of Birch and
    // reading order would match listing order again.
    const edges: WrGraphEdge[] = [
      { from: 'atlas', to: 'birch' },
      { from: 'atlas', to: 'cedar' },
      { from: 'cedar', to: 'dune' },
      { from: 'birch', to: 'dune' },
      { from: 'dune', to: 'ember' },
    ];
    fixture.componentInstance.edges.set(edges);
    fixture.detectChanges();

    // The case this test exists for: Cedar's edge into Dune is listed first, and Birch reads first.
    expect(items(root()).map(cardText)).toEqual(['Atlas', 'Birch', 'Cedar', 'Dune', 'Ember']);
    expect(edges.filter(edge => edge.to === 'dune').map(edge => edge.from)).toEqual(['cedar', 'birch']);
    expect(relationText(itemNamed(root(), 'Dune'))).toBe('Parents: Birch and Cedar. Children: Ember.');
  });

  it('names a neighbour once however many edges join them', () => {
    // Dune reaches Ember twice; the leaf still has one parent, and has no children sentence.
    expect(relationText(itemNamed(root(), 'Ember'))).toBe('Parents: Dune.');
  });

  it('writes no relation text for a node with no edges', () => {
    fixture.componentInstance.nodes.set([...NODES, { id: 'fjord', label: 'Fjord' }]);
    fixture.detectChanges();
    expect(relationText(itemNamed(root(), 'Fjord'))).toBeNull();
  });

  it('drops the list role when there are no nodes', () => {
    fixture.componentInstance.nodes.set([]);
    fixture.componentInstance.edges.set([]);
    fixture.detectChanges();

    expect(list().hasAttribute('role')).toBe(false);
    expect(items(root())).toHaveLength(0);
    expect(edgePaths(root())).toHaveLength(0);
    // The viewport is still a named, focusable group.
    expect(viewport().getAttribute('aria-label')).toBe('Graph');
  });

  it('carries the public BEM classes', () => {
    // These are public API — consumers style against them.
    expect(root().querySelector('wr-graph')?.classList.contains('wr-graph')).toBe(true);
    for (const name of ['viewport', 'stage', 'edges', 'edge', 'nodes', 'node', 'card', 'sr-only']) {
      expect(root().querySelector(`.wr-graph__${name}`), name).toBeTruthy();
    }
  });
});

describe('WrGraph with a node template', () => {
  it('renders the template with the node as its implicit context, instead of the card', () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.wr-graph__card')).toBeNull();
    expect([...root.querySelectorAll('.person')].map(el => el.textContent?.trim())).toEqual([
      'Mira Vale / Lead',
      'Oren Pike / Engineer',
    ]);
    // The relation text stays with the graph, not the template.
    const person = root.querySelectorAll<HTMLElement>('[role="listitem"]')[1];
    expect(relationText(person)).toBe('Parents: Mira Vale.');
  });
});

describe('WrGraph arrowhead markers across two graphs on one page', () => {
  it('gives each graph its own marker, and each line points at its own graph’s', () => {
    const fixture = TestBed.createComponent(TwoGraphsHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const ids = [...root.querySelectorAll('marker')].map(marker => marker.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);

    for (const graph of root.querySelectorAll<HTMLElement>('wr-graph')) {
      const own = graph.querySelector('marker')!.id;
      for (const path of edgePaths(graph)) expect(path.getAttribute('marker-end')).toBe(`url(#${own})`);
    }
  });
});

/**
 * Reading direction. `Directionality` resolves the document's direction when it is
 * constructed, so the honest way to test the other one is to provide a fake. The
 * case is a PAIR: an RTL picture alone cannot tell "mirrored" from "drawn anywhere".
 */
describe('WrGraph under a reading direction', () => {
  // Neither the default width nor one width for every node: a mirror that
  // subtracted 160, or the graph-wide width, instead of each node's own would pass
  // on a fixture that only ever used it. The self-loop brings its sideways control
  // points into the comparison.
  const mount = (dir: Direction): HTMLElement => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: dir, valueSignal: signal(dir), change: EMPTY } }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.nodeWidth.set(136);
    fixture.componentInstance.nodes.set([{ id: 'atlas', label: 'Atlas', width: 220 }, ...NODES.slice(1)]);
    fixture.componentInstance.edges.set([...EDGES, { from: 'ember', to: 'ember' }]);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('mirrors every node, every line point and every control point across the stage, and nothing else', () => {
    const ltr = mount('ltr');
    const ltrStage = ltr.querySelector<HTMLElement>('.wr-graph__stage')!;
    const ltrNodes = new Map(items(ltr).map(item => [cardText(item), position(item)]));
    const ltrLines = edgePaths(ltr).map(commands);

    const rtl = mount('rtl');
    const rtlStage = rtl.querySelector<HTMLElement>('.wr-graph__stage')!;
    const width = parseFloat(rtlStage.style.width);
    expect(rtlStage.getAttribute('style')).toBe(ltrStage.getAttribute('style'));

    // DOM order is reading order in layout terms, so it does not change with direction.
    expect(items(rtl).map(cardText)).toEqual([...ltrNodes.keys()]);
    expect(items(rtl).map(item => item.style.width)).toEqual(expect.arrayContaining(['136px', '220px']));
    for (const item of items(rtl)) {
      const before = ltrNodes.get(cardText(item))!;
      const after = position(item);
      expect(after.y).toBe(before.y);
      expect(after.x).toBeCloseTo(width - before.x - parseFloat(item.style.width), 1);
    }

    // Every number of every command: in `M x y`, `C x1 y1 x2 y2 x y` and `L x y` the
    // even positions are x and the odd ones y, control points included.
    const rtlLines = edgePaths(rtl).map(commands);
    expect(rtlLines).toHaveLength(EDGES.length + 1);
    expect(rtlLines.map(line => line.map(({ command }) => command))).toEqual(
      ltrLines.map(line => line.map(({ command }) => command))
    );
    rtlLines.forEach((line, i) => {
      line.forEach(({ numbers }, k) => {
        const before = ltrLines[i][k].numbers;
        expect(numbers).toHaveLength(before.length);
        numbers.forEach((value, n) => {
          if (n % 2) expect(value, `edge ${i}, command ${k}, y ${n}`).toBe(before[n]);
          else expect(value, `edge ${i}, command ${k}, x ${n}`).toBeCloseTo(width - before[n], 1);
        });
      });
    });
    // A real mirror: some line leaves one half for the other.
    expect(rtlLines.some((line, i) => line[0].numbers[0] !== ltrLines[i][0].numbers[0])).toBe(true);
  });
});

describe('WrGraph dev-mode warnings', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let warn: MockInstance<typeof console.warn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const warnings = (): string[] => warn.mock.calls.map(call => String(call[0]));

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(Host);
  });

  afterEach(() => warn.mockRestore());

  it('says nothing about a clean graph', () => {
    fixture.detectChanges();
    expect(warnings().filter(message => message.includes('<wr-graph>'))).toEqual([]);
  });

  it('skips an edge to a node that does not exist, and says which', () => {
    fixture.componentInstance.edges.set([...EDGES, { from: 'atlas', to: 'nowhere' }]);
    fixture.detectChanges();

    expect(edgePaths(root())).toHaveLength(6);
    expect(edgePaths(root()).some(path => path.dataset['to'] === 'nowhere')).toBe(false);
    expect(warnings().some(message => message.includes('#6') && message.includes('"nowhere"'))).toBe(true);
  });

  it('draws the first of two nodes sharing an id, and says which id', () => {
    fixture.componentInstance.nodes.set([...NODES, { id: 'birch', label: 'Second Birch' }]);
    fixture.detectChanges();

    expect(items(root())).toHaveLength(5);
    expect(items(root()).map(cardText)).not.toContain('Second Birch');
    expect(warnings().some(message => message.includes('"birch"') && message.includes('more than once'))).toBe(true);
  });

  it('falls back to nodeWidth / nodeHeight for a size that is not a positive number, and says so', () => {
    fixture.componentInstance.nodes.set([
      { id: 'atlas', label: 'Atlas', width: -5, height: Number.NaN },
      ...NODES.slice(1),
    ]);
    fixture.detectChanges();

    const atlas = itemNamed(root(), 'Atlas');
    expect(atlas.style.width).toBe('160px');
    expect(atlas.style.height).toBe('48px');
    expect(warnings().some(message => message.includes('"atlas"') && message.includes('width or height'))).toBe(true);
  });

  it('falls back on each graph-wide size by itself, and names the size it actually used', () => {
    // Only the width is invalid, so the height the consumer bound still applies —
    // and the warning must say 160 × 60, not the 160 × 48 of two defaults.
    fixture.componentInstance.nodeWidth.set(0);
    fixture.componentInstance.nodeHeight.set(60);
    fixture.detectChanges();

    const birch = itemNamed(root(), 'Birch');
    expect(birch.style.width).toBe('160px');
    expect(birch.style.height).toBe('60px');
    const sizeWarnings = warnings().filter(message => message.includes('nodeWidth'));
    expect(sizeWarnings).toHaveLength(1);
    expect(sizeWarnings[0]).toContain('nodeWidth (0)');
    expect(sizeWarnings[0]).not.toContain('nodeHeight');
    expect(sizeWarnings[0]).toContain('160 × 60');
  });
});

describe('WrGraph input', () => {
  it('is never written to', () => {
    const deepFreeze = <T>(value: T): T => {
      if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }
      return value;
    };
    const nodes = deepFreeze(structuredClone([...NODES, { id: 'dune', label: 'Duplicate' }]));
    const edges = deepFreeze(structuredClone([...EDGES, { from: 'dune', to: 'dune' }, { from: 'x', to: 'y' }]));
    const before = structuredClone({ nodes, edges });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.nodes.set(nodes);
    fixture.componentInstance.edges.set(edges);
    fixture.detectChanges();
    warn.mockRestore();

    expect(items(fixture.nativeElement as HTMLElement)).toHaveLength(5);
    expect({ nodes, edges }).toEqual(before);
  });
});

/**
 * The layout seam is internal in this release, but it is the DI token the
 * component resolves — so a provided engine has to be the one that runs, and an
 * asynchronous one has to fail visibly rather than hang or half-draw.
 */
describe('WrGraph layout engine', () => {
  const inRow = (input: WrGraphLayoutInput): WrGraphLayoutResult => ({
    nodes: input.nodes.map((node, i) => ({ id: node.id, x: i * 200, y: 0 })),
    edges: input.edges.map(edge => ({
      id: edge.id,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    })),
    width: input.nodes.length * 200,
    height: 48,
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses a provided layout instead of the built-in one', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WrGraphLayout, useValue: { layout: inRow } satisfies WrGraphLayout }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(itemNamed(root, 'Cedar').getAttribute('style')).toContain('translate(400px, 0px)');
    expect(root.querySelector<HTMLElement>('.wr-graph__stage')!.style.width).toBe('1000px');
  });

  it('draws nothing for an asynchronous layout, and says why', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WrGraphLayout,
          useValue: { layout: input => Promise.resolve(inRow(input)) } satisfies WrGraphLayout,
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(items(root)).toHaveLength(0);
    expect(edgePaths(root)).toHaveLength(0);
    expect(root.querySelector('.wr-graph__nodes')!.hasAttribute('role')).toBe(false);
    expect(warn.mock.calls.some(call => String(call[0]).includes('Promise'))).toBe(true);
  });

  it('says so when a layout leaves a node unplaced or returns a number it cannot draw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WrGraphLayout,
          useValue: {
            layout: input => {
              const result = inRow(input);
              return { ...result, nodes: result.nodes.filter(node => node.id !== 'ember'), width: Number.NaN };
            },
          } satisfies WrGraphLayout,
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    // What it can draw, it draws; the unplaced node is simply absent.
    expect(items(fixture.nativeElement as HTMLElement).map(cardText)).not.toContain('Ember');
    const faithful = warn.mock.calls.map(call => String(call[0])).filter(message => message.includes('faithfully'));
    expect(faithful).toHaveLength(1);
    expect(faithful[0]).toContain('no position for "ember"');
    expect(faithful[0]).toContain('not a finite number');
  });
});

/**
 * The relation sentences join names with `Intl.ListFormat`. Whatever the runtime
 * cannot serve must resolve to `'en'` exactly — never to the machine's own locale,
 * which the prerendering server and the browser need not share. The formatter is
 * replaced by a subclass that records what each instance RESOLVED to, because the
 * text alone cannot tell `'en'` from an `'en-US'` host default.
 */
describe('WrGraph list locale', () => {
  const RealListFormat = Intl.ListFormat;
  let resolved: string[];

  beforeEach(() => {
    resolved = [];
    class RecordingListFormat extends RealListFormat {
      constructor(...args: ConstructorParameters<typeof Intl.ListFormat>) {
        super(...args);
        resolved.push(this.resolvedOptions().locale);
      }
    }
    Object.defineProperty(Intl, 'ListFormat', { value: RecordingListFormat, configurable: true, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(Intl, 'ListFormat', { value: RealListFormat, configurable: true, writable: true });
  });

  const mount = (locale: string): HTMLElement => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('joins names the way a supported locale does', () => {
    const root = mount('de');
    expect(resolved).toContain('de');
    expect(relationText(itemNamed(root, 'Atlas'))).toBe('Children: Birch und Cedar.');
  });

  it('uses en, not the host default, for a well-formed locale the runtime has no data for', () => {
    // `new Intl.ListFormat('zz')` does not throw — it resolves to the machine's locale.
    expect(RealListFormat.supportedLocalesOf('zz')).toEqual([]);
    const root = mount('zz');
    expect(resolved.length).toBeGreaterThan(0);
    expect(new Set(resolved)).toEqual(new Set(['en']));
    expect(relationText(itemNamed(root, 'Atlas'))).toBe('Children: Birch and Cedar.');
  });

  it('uses en for a tag that is not a locale at all, rather than throwing', () => {
    const root = mount('not a tag');
    expect(new Set(resolved)).toEqual(new Set(['en']));
    expect(relationText(itemNamed(root, 'Atlas'))).toBe('Children: Birch and Cedar.');
  });
});
