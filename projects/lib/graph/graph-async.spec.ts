import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrGraph } from './graph';
import { WrGraphLayout } from './internal/layout/types';
import type { WrGraphLayoutContext, WrGraphLayoutInput, WrGraphLayoutResult } from './internal/layout/types';
import type { WrGraphEdge, WrGraphNode } from './types';

/**
 * A layout that answers with a Promise. The engine here is a recorder: every
 * call is kept with the signal it was given and the two handles that settle it,
 * so a spec decides when, and in what order, each run lands. No timer is
 * involved anywhere.
 */
const NODES: readonly WrGraphNode[] = [
  { id: 'atlas', label: 'Atlas' },
  { id: 'birch', label: 'Birch' },
];
const EDGES: readonly WrGraphEdge[] = [{ from: 'atlas', to: 'birch' }];

const MORE_NODES: readonly WrGraphNode[] = [...NODES, { id: 'cedar', label: 'Cedar' }];

/** Every node on one line, 200 apart, each edge a straight line between two tops. */
const inRow = (input: WrGraphLayoutInput): WrGraphLayoutResult => ({
  nodes: input.nodes.map((node, index) => ({ id: node.id, x: index * 200, y: 0 })),
  edges: input.edges.map(edge => ({
    id: edge.id,
    points: [
      { x: input.nodes.findIndex(node => node.id === edge.from) * 200, y: 0 },
      { x: input.nodes.findIndex(node => node.id === edge.to) * 200, y: 40 },
    ],
  })),
  width: input.nodes.length * 200,
  height: 48,
});

interface Call {
  readonly input: WrGraphLayoutInput;
  readonly signal: AbortSignal;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
}

@Component({
  imports: [WrGraph],
  template: `<wr-graph [nodes]="nodes()" [edges]="edges()" (layoutError)="errors.push($event)" />`,
})
class Host {
  readonly nodes = signal<readonly WrGraphNode[]>(NODES);
  readonly edges = signal<readonly WrGraphEdge[]>(EDGES);
  readonly errors: unknown[] = [];
}

const labels = (root: ParentNode): string[] =>
  [...root.querySelectorAll('.wr-graph__card')].map(card => card.textContent.trim());

describe('WrGraph with an asynchronous layout', () => {
  let calls: Call[];
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-graph')!;
  const viewport = (): HTMLElement => root().querySelector<HTMLElement>('.wr-graph__viewport')!;

  /** Lets the settled Promise reach the component, then renders. */
  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  };

  const create = (layout: WrGraphLayout['layout']): void => {
    TestBed.configureTestingModule({ providers: [{ provide: WrGraphLayout, useValue: { layout } }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  const deferred = (input: WrGraphLayoutInput, context: WrGraphLayoutContext): Promise<WrGraphLayoutResult> =>
    new Promise<WrGraphLayoutResult>((resolve, reject) => {
      calls.push({ input, signal: context.signal, resolve: () => resolve(inRow(input)), reject });
    });

  const createDeferred = (): void => {
    calls = [];
    create(deferred);
  };

  afterEach(() => vi.restoreAllMocks());

  it('draws nothing while the first layout is pending, then draws what it resolved with', async () => {
    createDeferred();

    expect(calls).toHaveLength(1);
    expect(labels(root())).toEqual([]);

    calls[0].resolve();
    await settle();

    expect(labels(root())).toEqual(['Atlas', 'Birch']);
    expect(root().querySelectorAll('path.wr-graph__edge')).toHaveLength(1);
    expect(root().querySelector<HTMLElement>('.wr-graph__stage')!.style.width).toBe('400px');
  });

  it('is pending, and busy, until the layout settles', async () => {
    createDeferred();
    const graph = fixture.debugElement.children[0].componentInstance as WrGraph;

    expect(graph.layoutPending()).toBe(true);
    expect(host().classList.contains('wr-graph--pending')).toBe(true);
    expect(viewport().getAttribute('aria-busy')).toBe('true');

    calls[0].resolve();
    await settle();

    expect(graph.layoutPending()).toBe(false);
    expect(host().classList.contains('wr-graph--pending')).toBe(false);
    expect(viewport().hasAttribute('aria-busy')).toBe(false);

    fixture.componentInstance.nodes.set(MORE_NODES);
    fixture.detectChanges();

    expect(graph.layoutPending()).toBe(true);
    expect(viewport().getAttribute('aria-busy')).toBe('true');
  });

  it('keeps the whole last picture on screen while a newer layout is pending', async () => {
    createDeferred();
    calls[0].resolve();
    await settle();

    fixture.componentInstance.nodes.set([{ id: 'cedar', label: 'Cedar' }]);
    fixture.componentInstance.edges.set([]);
    fixture.detectChanges();

    expect(calls).toHaveLength(2);
    expect(labels(root())).toEqual(['Atlas', 'Birch']);
    expect(root().querySelectorAll('path.wr-graph__edge')).toHaveLength(1);
    expect(root().querySelector('.wr-graph__sr-only')?.textContent.trim()).toBe('Children: Birch.');

    calls[1].resolve();
    await settle();

    expect(labels(root())).toEqual(['Cedar']);
    expect(root().querySelectorAll('path.wr-graph__edge')).toHaveLength(0);
  });

  it('aborts the older run when the inputs change, and ignores its late result', async () => {
    createDeferred();
    expect(calls[0].signal.aborted).toBe(false);

    fixture.componentInstance.nodes.set(MORE_NODES);
    fixture.detectChanges();

    expect(calls).toHaveLength(2);
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(false);

    // The stale run lands first, and after the newer one started.
    calls[0].resolve();
    await settle();
    expect(labels(root())).toEqual([]);
    expect(host().classList.contains('wr-graph--pending')).toBe(true);

    calls[1].resolve();
    await settle();
    expect(labels(root())).toEqual(['Atlas', 'Birch', 'Cedar']);

    // And it stays ignored when it lands last.
    expect(root().querySelector<HTMLElement>('.wr-graph__stage')!.style.width).toBe('600px');
  });

  it('keeps the last result when a layout rejects, warns in dev mode and emits the error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    createDeferred();
    calls[0].resolve();
    await settle();

    fixture.componentInstance.nodes.set(MORE_NODES);
    fixture.detectChanges();
    const failure = new Error('worker crashed');
    calls[1].reject(failure);
    await settle();

    expect(labels(root())).toEqual(['Atlas', 'Birch']);
    expect(fixture.componentInstance.errors).toEqual([failure]);
    expect(host().classList.contains('wr-graph--pending')).toBe(false);
    expect(viewport().hasAttribute('aria-busy')).toBe(false);
    const rejected = warn.mock.calls.filter(call => String(call[0]).includes('rejected'));
    expect(rejected).toHaveLength(1);
    expect(rejected[0][1]).toBe(failure);
  });

  it('stays silent when a run that was aborted rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    createDeferred();

    fixture.componentInstance.nodes.set(MORE_NODES);
    fixture.detectChanges();
    calls[0].reject(new DOMException('Aborted', 'AbortError'));
    await settle();

    expect(fixture.componentInstance.errors).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    expect(host().classList.contains('wr-graph--pending')).toBe(true);
  });

  it('aborts the run in flight when the graph is destroyed', async () => {
    createDeferred();
    expect(calls[0].signal.aborted).toBe(false);

    fixture.destroy();

    expect(calls[0].signal.aborted).toBe(true);
    calls[0].reject(new Error('too late'));
    await Promise.resolve();
    await Promise.resolve();
    expect(fixture.componentInstance.errors).toEqual([]);
  });

  it('draws a synchronous layout in the same pass, never pending and never aborted', () => {
    const signals: AbortSignal[] = [];
    create((input, context) => {
      signals.push(context.signal);
      return inRow(input);
    });
    const graph = fixture.debugElement.children[0].componentInstance as WrGraph;

    // One `detectChanges()`, and no await anywhere in this spec.
    expect(labels(root())).toEqual(['Atlas', 'Birch']);
    expect(graph.layoutPending()).toBe(false);
    expect(host().classList.contains('wr-graph--pending')).toBe(false);
    expect(viewport().hasAttribute('aria-busy')).toBe(false);

    fixture.componentInstance.nodes.set(MORE_NODES);
    fixture.detectChanges();

    expect(labels(root())).toEqual(['Atlas', 'Birch', 'Cedar']);
    expect(signals).toHaveLength(2);
    expect(signals.every(each => !each.aborted)).toBe(true);
  });
});
