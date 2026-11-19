import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrGraph } from './graph';
import { WrGraphNodeTemplate } from './graph-node-template';
import type { WrGraphEdge, WrGraphNode } from './types';

/**
 * Selection and highlight, read off what the component wrote: the button in
 * each node, its `aria-pressed`, the modifier classes on nodes and edges, the
 * marker an edge points at and the `selected` model.
 *
 * Atlas has two children, Birch and Cedar; Birch has one, Dune; Ember has no
 * edge at all. So selecting Birch lights Atlas and Dune and dims Cedar and Ember.
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
];

/** Every class the selection writes on a node or an edge. */
const MARKED =
  '.wr-graph__node--selected, .wr-graph__node--linked, .wr-graph__node--dimmed, ' +
  '.wr-graph__edge--linked, .wr-graph__edge--dimmed';

@Component({
  imports: [WrGraph, WrGraphNodeTemplate],
  template: `
    <wr-graph
      [nodes]="nodes()"
      [edges]="edges"
      [selectable]="selectable()"
      [zoomable]="zoomable()"
      [(selected)]="selected"
    >
      @if (links()) {
        <ng-template wrGraphNode let-node>
          <span class="name">{{ node.label }}</span>
          <a class="more" href="#more">More</a>
        </ng-template>
      }
    </wr-graph>
  `,
})
class Host {
  readonly nodes = signal<readonly WrGraphNode[]>(NODES);
  readonly edges = EDGES;
  readonly selectable = signal(true);
  readonly zoomable = signal(false);
  readonly selected = signal<string | null>(null);
  readonly links = signal(false);
}

describe('WrGraph selection', () => {
  let fixture: ComponentFixture<Host>;
  /** The key presses that got past the graph, to the element around it. */
  let keydowns: Event[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-graph')!;
  const viewport = (): HTMLElement => root().querySelector<HTMLElement>('.wr-graph__viewport')!;
  const node = (label: string): HTMLElement => {
    const found = [...root().querySelectorAll<HTMLElement>('.wr-graph__node')].find(
      item => item.querySelector('.wr-graph__card, .name')?.textContent?.trim() === label
    );
    if (!found) throw new Error(`no node drawn as "${label}"`);
    return found;
  };
  const button = (label: string): HTMLElement => node(label).querySelector<HTMLElement>('.wr-graph__select')!;
  const edge = (from: string, to: string): SVGPathElement =>
    root().querySelector<SVGPathElement>(`.wr-graph__edge[data-from="${from}"][data-to="${to}"]`)!;

  /** The labels of the nodes carrying a modifier, sorted: where the layout puts a node is not this file's. */
  const marked = (modifier: string): string[] =>
    [...root().querySelectorAll<HTMLElement>(`.wr-graph__node--${modifier}`)]
      .map(item => item.querySelector('.wr-graph__card, .name')!.textContent.trim())
      .sort();

  const create = (setup?: (host: Host) => void): void => {
    fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    keydowns = [];
    root().addEventListener('keydown', event => keydowns.push(event));
  };

  const click = (target: HTMLElement): void => {
    target.click();
    fixture.detectChanges();
  };

  const key = (name: string, target: HTMLElement, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('when selectable is off', () => {
    it('is off by default, and the graph is drawn as before', () => {
      @Component({ imports: [WrGraph], template: `<wr-graph [nodes]="nodes" [edges]="edges" selected="birch" />` })
      class Plain {
        readonly nodes = NODES;
        readonly edges = EDGES;
      }
      const plain = TestBed.createComponent(Plain);
      plain.detectChanges();
      const element = plain.nativeElement as HTMLElement;

      expect(element.querySelector('wr-graph')!.classList.contains('wr-graph--selectable')).toBe(false);
      expect(element.querySelector('.wr-graph__select')).toBeNull();
      expect(element.querySelector('[aria-pressed]')).toBeNull();
      expect(element.querySelectorAll('marker')).toHaveLength(1);
      // The card is still the node's own child.
      expect(element.querySelector('.wr-graph__node > .wr-graph__card')).not.toBeNull();
      // A bound `selected` highlights nothing while the graph is not selectable.
      expect(element.querySelector(MARKED)).toBeNull();
    });

    it('does not take a click or Escape', () => {
      create(h => h.selectable.set(false));

      click(node('Birch'));
      expect(fixture.componentInstance.selected()).toBeNull();

      fixture.componentInstance.selected.set('birch');
      fixture.detectChanges();
      const escape = key('Escape', viewport());
      expect(escape.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.selected()).toBe('birch');
    });
  });

  describe('markup', () => {
    it('makes every node a button inside its list item, unpressed', () => {
      create();

      expect(host().classList.contains('wr-graph--selectable')).toBe(true);
      const items = [...root().querySelectorAll<HTMLElement>('.wr-graph__nodes > .wr-graph__node')];
      expect(items).toHaveLength(5);
      for (const item of items) {
        expect(item.getAttribute('role')).toBe('listitem');
        const pick = item.querySelector<HTMLElement>(':scope > .wr-graph__select')!;
        expect(pick.getAttribute('role')).toBe('button');
        expect(pick.getAttribute('tabindex')).toBe('0');
        expect(pick.getAttribute('aria-pressed')).toBe('false');
        expect(pick.querySelector(':scope > .wr-graph__card')).not.toBeNull();
      }
    });

    it('keeps the relation sentence beside the button, out of its name', () => {
      create();

      const sentence = node('Birch').querySelector(':scope > .wr-graph__sr-only')!;
      expect(sentence.textContent).toBe('Parents: Atlas. Children: Dune.');
      expect(button('Birch').textContent.trim()).toBe('Birch');
    });

    it('highlights nothing while nothing is selected', () => {
      create();

      expect(root().querySelector(MARKED)).toBeNull();
      for (const path of root().querySelectorAll('.wr-graph__edge')) {
        expect(path.getAttribute('marker-end')).not.toContain('-linked');
      }
    });
  });

  describe('with the pointer', () => {
    it('selects the node, lights its edges and neighbours and dims the rest', () => {
      create();

      click(button('Birch'));

      expect(fixture.componentInstance.selected()).toBe('birch');
      expect(button('Birch').getAttribute('aria-pressed')).toBe('true');
      expect(button('Atlas').getAttribute('aria-pressed')).toBe('false');
      expect(marked('selected')).toEqual(['Birch']);
      expect(marked('linked')).toEqual(['Atlas', 'Dune']);
      expect(marked('dimmed')).toEqual(['Cedar', 'Ember']);

      const linkedMarker = root().querySelector('marker.wr-graph__arrow--linked')!;
      for (const lit of [edge('atlas', 'birch'), edge('birch', 'dune')]) {
        expect(lit.classList.contains('wr-graph__edge--linked')).toBe(true);
        expect(lit.classList.contains('wr-graph__edge--dimmed')).toBe(false);
        expect(lit.getAttribute('marker-end')).toBe(`url(#${linkedMarker.id})`);
      }
      const other = edge('atlas', 'cedar');
      expect(other.classList.contains('wr-graph__edge--dimmed')).toBe(true);
      expect(other.classList.contains('wr-graph__edge--linked')).toBe(false);
      expect(other.getAttribute('marker-end')).not.toBe(`url(#${linkedMarker.id})`);
    });

    it('moves the selection to another node', () => {
      create();

      click(button('Birch'));
      click(button('Ember'));

      expect(fixture.componentInstance.selected()).toBe('ember');
      expect(marked('selected')).toEqual(['Ember']);
      expect(marked('linked')).toEqual([]);
      expect(marked('dimmed')).toEqual(['Atlas', 'Birch', 'Cedar', 'Dune']);
      expect(root().querySelectorAll('.wr-graph__edge--dimmed')).toHaveLength(3);
    });

    it('clears the selection on a second click, and every mark with it', () => {
      create();

      click(button('Birch'));
      click(button('Birch'));

      expect(fixture.componentInstance.selected()).toBeNull();
      expect(button('Birch').getAttribute('aria-pressed')).toBe('false');
      expect(root().querySelector(MARKED)).toBeNull();
    });

    it('leaves a click on a link inside the node to the link', () => {
      create(h => h.links.set(true));
      const link = node('Birch').querySelector<HTMLElement>('.more')!;
      link.addEventListener('click', event => event.preventDefault());

      click(link);
      expect(fixture.componentInstance.selected()).toBeNull();

      click(node('Birch').querySelector<HTMLElement>('.name')!);
      expect(fixture.componentInstance.selected()).toBe('birch');
      expect(marked('linked')).toEqual(['Atlas', 'Dune']);
    });
  });

  describe('with the keyboard', () => {
    it.each(['Enter', ' '])('selects and clears with %j, and takes the key', name => {
      create();

      const down = key(name, button('Cedar'));
      expect(down.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.selected()).toBe('cedar');
      expect(button('Cedar').getAttribute('aria-pressed')).toBe('true');

      key(name, button('Cedar'));
      expect(fixture.componentInstance.selected()).toBeNull();
    });

    it('ignores other keys, a modifier, and a key pressed inside the node', () => {
      create(h => h.links.set(true));

      expect(key('a', button('Cedar')).defaultPrevented).toBe(false);
      expect(key('Enter', button('Cedar'), { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(key('Enter', node('Cedar').querySelector<HTMLElement>('.more')!).defaultPrevented).toBe(false);
      expect(fixture.componentInstance.selected()).toBeNull();
    });

    it('clears the selection with Escape from anywhere in the graph, and keeps that press to itself', () => {
      create();

      click(button('Birch'));
      const fromNode = key('Escape', button('Atlas'));
      expect(fixture.componentInstance.selected()).toBeNull();
      expect(fromNode.defaultPrevented).toBe(true);
      expect(keydowns).not.toContain(fromNode);

      click(button('Birch'));
      key('Escape', viewport());
      expect(fixture.componentInstance.selected()).toBeNull();
      expect(marked('selected')).toEqual([]);
    });

    it('lets Escape through when there is nothing to clear', () => {
      create();

      const escape = key('Escape', button('Atlas'));

      expect(escape.defaultPrevented).toBe(false);
      expect(keydowns).toContain(escape);
    });
  });

  describe('the selected model', () => {
    it('selects the node written to it', () => {
      create(h => h.selected.set('atlas'));

      expect(button('Atlas').getAttribute('aria-pressed')).toBe('true');
      expect(marked('linked')).toEqual(['Birch', 'Cedar']);
      expect(marked('dimmed')).toEqual(['Dune', 'Ember']);

      fixture.componentInstance.selected.set(null);
      fixture.detectChanges();
      expect(root().querySelector(MARKED)).toBeNull();
    });

    it('highlights nothing for an id no node has, and keeps the value', () => {
      create(h => h.selected.set('nowhere'));

      expect(root().querySelector(MARKED)).toBeNull();
      expect(root().querySelector('[aria-pressed="true"]')).toBeNull();
      expect(fixture.componentInstance.selected()).toBe('nowhere');
    });

    it('drops the highlight when the selected node leaves the graph', () => {
      create(h => h.selected.set('ember'));
      expect(marked('selected')).toEqual(['Ember']);

      fixture.componentInstance.nodes.set(NODES.slice(0, 4));
      fixture.detectChanges();

      expect(root().querySelector(MARKED)).toBeNull();
    });
  });

  describe('in a zoomable graph', () => {
    const pointer = (type: string, x: number, y: number, target: Element): void => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y,
        })
      );
    };

    it('pans from a drag that starts on a node, and the click after it selects nothing', () => {
      const frames: FrameRequestCallback[] = [];
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => frames.push(callback));
      vi.stubGlobal('cancelAnimationFrame', (): void => undefined);
      create(h => h.zoomable.set(true));
      fixture.detectChanges();
      const pick = button('Birch');

      pointer('pointerdown', 400, 300, pick);
      pointer('pointermove', 460, 340, pick);
      expect(host().classList.contains('wr-graph--panning')).toBe(false);
      fixture.detectChanges();
      expect(host().classList.contains('wr-graph--panning')).toBe(true);
      pointer('pointerup', 460, 340, pick);
      click(pick);
      expect(fixture.componentInstance.selected()).toBeNull();

      // A press that never moved is a click.
      pointer('pointerdown', 400, 300, pick);
      pointer('pointerup', 400, 300, pick);
      click(pick);
      expect(fixture.componentInstance.selected()).toBe('birch');
    });
  });
});

describe('WrGraph selection styles', () => {
  const css = compileSass("@use 'graph/styles';");
  const rule = (selector: string): string => {
    const at = css.indexOf(`${selector} {`);
    if (at < 0) throw new Error(`no rule for ${selector}`);
    return css.slice(at, css.indexOf('}', at));
  };

  it('paints the selection through hooks that default to role tokens', () => {
    const hooks = rule('.wr-graph');

    expect(hooks).toContain('--wr-graph-selected-ring-color: var(--wr-color-primary)');
    expect(hooks).toContain('--wr-graph-linked-edge-color: var(--wr-color-primary)');
    expect(hooks).toContain('--wr-graph-select-radius: var(--wr-graph-card-radius)');
    expect(hooks).toMatch(/--wr-graph-dimmed-opacity: 0?\.4/);
  });

  it('colours a linked edge and its arrowhead, and fades a dimmed one', () => {
    expect(rule('.wr-graph__edge--linked')).toContain('stroke: var(--wr-graph-linked-edge-color)');
    expect(rule('.wr-graph__edges .wr-graph__arrow--linked polygon')).toContain(
      'fill: var(--wr-graph-linked-edge-color)'
    );
    expect(rule('.wr-graph__edge--dimmed')).toContain('opacity: var(--wr-graph-dimmed-opacity)');
  });

  it('fades a dimmed node unless it holds the focus, and rings the selected one', () => {
    expect(rule('.wr-graph__node--dimmed:not(:focus-within)')).toContain('opacity: var(--wr-graph-dimmed-opacity)');
    expect(rule('.wr-graph__node--selected > .wr-graph__select::after')).toContain(
      'border: var(--wr-graph-selected-ring-width) solid var(--wr-graph-selected-ring-color)'
    );
  });
});
