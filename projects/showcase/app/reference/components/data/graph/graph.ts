import { Component, Directive, signal } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';
import { WrButton } from 'ngwr/button';
import {
  WrGraph,
  WrGraphLayout,
  WrGraphNodeTemplate,
  WrLayeredGraphLayout,
  type WrGraphEdge,
  type WrGraphLayoutContext,
  type WrGraphLayoutInput,
  type WrGraphLayoutResult,
  type WrGraphNode,
} from 'ngwr/graph';

import {
  DocApiComponent,
  type DocApiRow,
  type DocCodeFile,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

/** What the team demo's template reads off `node.data`. */
interface TeamEntry {
  readonly kind: 'unit' | 'person';
  readonly role?: string;
  readonly initials?: string;
}

/** What the dependency demo's template reads off `node.data`. */
interface PackageEntry {
  readonly version: string;
}

// Every name below is invented — the people, the teams and the packages.

const WORKFLOW_NODES: readonly WrGraphNode[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'outline', label: 'Outline' },
  { id: 'draft', label: 'Draft' },
  { id: 'publish', label: 'Publish' },
];

const WORKFLOW_EDGES: readonly WrGraphEdge[] = [
  { from: 'idea', to: 'sketch' },
  { from: 'idea', to: 'outline' },
  { from: 'sketch', to: 'draft' },
  { from: 'outline', to: 'draft' },
  { from: 'draft', to: 'publish' },
];

const TEAM_NODES: readonly WrGraphNode<TeamEntry>[] = [
  { id: 'platform', label: 'Platform', height: 40, data: { kind: 'unit' } },
  { id: 'design', label: 'Design', height: 40, data: { kind: 'unit' } },
  { id: 'research', label: 'Research', height: 40, data: { kind: 'unit' } },
  { id: 'mira', label: 'Mira Okafor', data: { kind: 'person', role: 'Head of platform', initials: 'MO' } },
  { id: 'tomas', label: 'Tomas Lindqvist', data: { kind: 'person', role: 'Head of platform', initials: 'TL' } },
  { id: 'lena', label: 'Lena Brandt', data: { kind: 'person', role: 'Head of design', initials: 'LB' } },
  { id: 'yara', label: 'Yara Castell', data: { kind: 'person', role: 'Head of research', initials: 'YC' } },
  { id: 'noor', label: 'Noor Haddad', data: { kind: 'person', role: 'Product designer', initials: 'NH' } },
  { id: 'dev', label: 'Dev Sandoval', data: { kind: 'person', role: 'Engineer', initials: 'DS' } },
  { id: 'emil', label: 'Emil Sorensen', data: { kind: 'person', role: 'Analyst', initials: 'ES' } },
];

const TEAM_EDGES: readonly WrGraphEdge[] = [
  // Platform has two heads, and Dev reports to both of them.
  { from: 'platform', to: 'mira' },
  { from: 'platform', to: 'tomas' },
  { from: 'mira', to: 'dev' },
  { from: 'tomas', to: 'dev' },
  { from: 'design', to: 'lena' },
  { from: 'research', to: 'yara' },
  { from: 'yara', to: 'emil' },
  // Noor belongs to two teams at once.
  { from: 'design', to: 'noor' },
  { from: 'research', to: 'noor' },
];

const PACKAGE_NODES: readonly WrGraphNode<PackageEntry>[] = [
  { id: 'app', label: '@example/app', data: { version: '1.0.0' } },
  { id: 'router', label: '@example/router', data: { version: '3.2.1' } },
  { id: 'forms', label: '@example/forms', data: { version: '2.0.4' } },
  { id: 'ui', label: '@example/ui', data: { version: '5.1.0' } },
  { id: 'signals', label: '@example/signals', data: { version: '1.8.0' } },
  { id: 'url-pattern', label: '@example/url-pattern', data: { version: '0.9.2' } },
  { id: 'validators', label: '@example/validators', data: { version: '2.3.0' } },
  { id: 'tokens', label: '@example/tokens', data: { version: '4.0.0' } },
];

const PACKAGE_EDGES: readonly WrGraphEdge[] = [
  { from: 'app', to: 'router' },
  { from: 'app', to: 'forms' },
  { from: 'app', to: 'ui' },
  { from: 'app', to: 'signals' },
  { from: 'router', to: 'signals' },
  { from: 'router', to: 'url-pattern' },
  { from: 'forms', to: 'signals' },
  { from: 'forms', to: 'validators' },
  { from: 'ui', to: 'signals' },
  { from: 'ui', to: 'tokens' },
];

/** The built-in layout, answered late: what a worker or a server would do. */
class DelayedLayout extends WrGraphLayout {
  private readonly layered = new WrLayeredGraphLayout();

  override layout(input: WrGraphLayoutInput, { signal }: WrGraphLayoutContext): Promise<WrGraphLayoutResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(this.layered.layout(input)), 800);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      });
    });
  }
}

/** Gives one graph of the page the delayed layout; the others keep the built-in one. */
@Directive({
  selector: 'wr-graph[ngwrDelayedLayout]',
  providers: [{ provide: WrGraphLayout, useClass: DelayedLayout }],
})
class DelayedLayoutDirective {}

@Component({
  selector: 'ngwr-graph-page',
  templateUrl: './graph.html',
  styleUrl: './graph.scss',
  imports: [
    WrGraph,
    WrGraphNodeTemplate,
    WrAvatar,
    WrButton,
    DelayedLayoutDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocApiComponent,
  ],
})
export default class GraphPageComponent {
  protected readonly workflowNodes = WORKFLOW_NODES;
  protected readonly workflowEdges = WORKFLOW_EDGES;
  protected readonly teamNodes = TEAM_NODES;
  protected readonly teamEdges = TEAM_EDGES;
  protected readonly packageNodes = PACKAGE_NODES;
  protected readonly packageEdges = PACKAGE_EDGES;

  protected readonly reviewNodes = signal<readonly WrGraphNode[]>(WORKFLOW_NODES);
  protected readonly reviewEdges = signal<readonly WrGraphEdge[]>(WORKFLOW_EDGES);

  /** Puts one more review between the draft and publishing. */
  protected addReview(): void {
    const count = this.reviewNodes().length - WORKFLOW_NODES.length + 1;
    const id = `review-${count}`;
    this.reviewNodes.update(nodes => [...nodes, { id, label: `Review ${count}` }]);
    this.reviewEdges.update(edges => [...edges, { from: 'draft', to: id }, { from: id, to: 'publish' }]);
  }

  protected readonly workflowFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-graph [nodes]="nodes" [edges]="edges" ariaLabel="Writing workflow" />`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component } from '@angular/core';

import { WrGraph, type WrGraphEdge, type WrGraphNode } from 'ngwr/graph';

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.html',
  imports: [WrGraph],
})
export class Workflow {
  protected readonly nodes: readonly WrGraphNode[] = [
    { id: 'idea', label: 'Idea' },
    { id: 'sketch', label: 'Sketch' },
    { id: 'outline', label: 'Outline' },
    { id: 'draft', label: 'Draft' },
    { id: 'publish', label: 'Publish' },
  ];

  // from = the parent, to = the child.
  protected readonly edges: readonly WrGraphEdge[] = [
    { from: 'idea', to: 'sketch' },
    { from: 'idea', to: 'outline' },
    { from: 'sketch', to: 'draft' },
    { from: 'outline', to: 'draft' },
    { from: 'draft', to: 'publish' },
  ];
}`,
    },
  ];

  protected readonly teamFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-graph [nodes]="nodes" [edges]="edges" [nodeWidth]="176" [nodeHeight]="56" ariaLabel="Team structure">
  <ng-template wrGraphNode let-node>
    @if (node.data.kind === 'unit') {
      <div class="unit">{{ node.label }}</div>
    } @else {
      <div class="person">
        <wr-avatar class="person__avatar" [size]="32" shape="circle">
          <span aria-hidden="true">{{ node.data.initials }}</span>
        </wr-avatar>
        <div class="person__text">
          <span class="person__name">{{ node.label }}</span>
          <span class="person__role">{{ node.data.role }}</span>
        </div>
      </div>
    }
  </ng-template>
</wr-graph>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';
import { WrGraph, WrGraphNodeTemplate, type WrGraphEdge, type WrGraphNode } from 'ngwr/graph';

interface TeamEntry {
  readonly kind: 'unit' | 'person';
  readonly role?: string;
  readonly initials?: string;
}

@Component({
  selector: 'app-team',
  templateUrl: './team.html',
  imports: [WrGraph, WrGraphNodeTemplate, WrAvatar],
  styles: \`
    .unit {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-weight: var(--wr-font-weight-semibold);
      color: var(--wr-color-primary-ink);
      background: var(--wr-color-primary-soft);
      border-radius: var(--wr-border-radius-base);
    }
    .person {
      display: flex;
      box-sizing: border-box;
      gap: 0.5rem;
      align-items: center;
      height: 100%;
      padding-inline: 0.625rem;
      background: var(--wr-color-surface);
      border: 1px solid var(--wr-border-base);
      border-radius: var(--wr-border-radius-base);
    }
    .person__avatar {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      font-size: var(--wr-text-xs);
      font-weight: var(--wr-font-weight-semibold);
      color: var(--wr-color-primary-ink);
      background: var(--wr-color-primary-soft);
    }
    .person__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .person__name {
      font-size: var(--wr-text-sm);
      font-weight: var(--wr-font-weight-semibold);
    }
    .person__role {
      font-size: var(--wr-text-xs);
      color: var(--wr-color-on-surface-muted);
    }
  \`,
})
export class Team {
  protected readonly nodes: readonly WrGraphNode<TeamEntry>[] = [
    { id: 'platform', label: 'Platform', height: 40, data: { kind: 'unit' } },
    { id: 'design', label: 'Design', height: 40, data: { kind: 'unit' } },
    { id: 'research', label: 'Research', height: 40, data: { kind: 'unit' } },
    { id: 'mira', label: 'Mira Okafor', data: { kind: 'person', role: 'Head of platform', initials: 'MO' } },
    { id: 'tomas', label: 'Tomas Lindqvist', data: { kind: 'person', role: 'Head of platform', initials: 'TL' } },
    { id: 'lena', label: 'Lena Brandt', data: { kind: 'person', role: 'Head of design', initials: 'LB' } },
    { id: 'yara', label: 'Yara Castell', data: { kind: 'person', role: 'Head of research', initials: 'YC' } },
    { id: 'noor', label: 'Noor Haddad', data: { kind: 'person', role: 'Product designer', initials: 'NH' } },
    { id: 'dev', label: 'Dev Sandoval', data: { kind: 'person', role: 'Engineer', initials: 'DS' } },
    { id: 'emil', label: 'Emil Sorensen', data: { kind: 'person', role: 'Analyst', initials: 'ES' } },
  ];

  protected readonly edges: readonly WrGraphEdge[] = [
    // Platform has two heads, and Dev reports to both of them.
    { from: 'platform', to: 'mira' },
    { from: 'platform', to: 'tomas' },
    { from: 'mira', to: 'dev' },
    { from: 'tomas', to: 'dev' },
    { from: 'design', to: 'lena' },
    { from: 'research', to: 'yara' },
    { from: 'yara', to: 'emil' },
    // Noor belongs to two teams at once.
    { from: 'design', to: 'noor' },
    { from: 'research', to: 'noor' },
  ];
}`,
    },
  ];

  protected readonly packageFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-graph [nodes]="nodes" [edges]="edges" [nodeWidth]="184" [nodeHeight]="52" ariaLabel="Dependencies">
  <ng-template wrGraphNode let-node>
    <div class="package">
      <code class="package__name">{{ node.label }}</code>
      <span class="package__version">{{ node.data.version }}</span>
    </div>
  </ng-template>
</wr-graph>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component } from '@angular/core';

import { WrGraph, WrGraphNodeTemplate, type WrGraphEdge, type WrGraphNode } from 'ngwr/graph';

@Component({
  selector: 'app-dependencies',
  templateUrl: './dependencies.html',
  imports: [WrGraph, WrGraphNodeTemplate],
  styles: \`
    .package {
      display: flex;
      box-sizing: border-box;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      padding-inline: 0.75rem;
      background: var(--wr-color-surface);
      border: 1px solid var(--wr-border-base);
      border-radius: var(--wr-border-radius-base);
    }
    .package__name {
      font-family: var(--wr-font-family-mono);
      font-size: var(--wr-text-sm);
    }
    .package__version {
      font-size: var(--wr-text-xs);
      color: var(--wr-color-on-surface-muted);
    }
  \`,
})
export class Dependencies {
  protected readonly nodes: readonly WrGraphNode<{ version: string }>[] = [
    { id: 'app', label: '@example/app', data: { version: '1.0.0' } },
    { id: 'router', label: '@example/router', data: { version: '3.2.1' } },
    { id: 'forms', label: '@example/forms', data: { version: '2.0.4' } },
    { id: 'ui', label: '@example/ui', data: { version: '5.1.0' } },
    { id: 'signals', label: '@example/signals', data: { version: '1.8.0' } },
    { id: 'url-pattern', label: '@example/url-pattern', data: { version: '0.9.2' } },
    { id: 'validators', label: '@example/validators', data: { version: '2.3.0' } },
    { id: 'tokens', label: '@example/tokens', data: { version: '4.0.0' } },
  ];

  // The parent is the package that depends; the child is its dependency.
  protected readonly edges: readonly WrGraphEdge[] = [
    { from: 'app', to: 'router' },
    { from: 'app', to: 'forms' },
    { from: 'app', to: 'ui' },
    { from: 'app', to: 'signals' },
    { from: 'router', to: 'signals' },
    { from: 'router', to: 'url-pattern' },
    { from: 'forms', to: 'signals' },
    { from: 'forms', to: 'validators' },
    { from: 'ui', to: 'signals' },
    { from: 'ui', to: 'tokens' },
  ];
}`,
    },
  ];

  protected readonly asyncFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-btn size="sm" (click)="addReview()">Add a review</wr-btn>

<wr-graph
  #graph
  [class.dimmed]="graph.layoutPending()"
  [nodes]="nodes()"
  [edges]="edges()"
  ariaLabel="Review workflow"
  (layoutError)="report($event)"
/>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import {
  WrGraph,
  WrGraphLayout,
  WrLayeredGraphLayout,
  type WrGraphEdge,
  type WrGraphLayoutContext,
  type WrGraphLayoutInput,
  type WrGraphLayoutResult,
  type WrGraphNode,
} from 'ngwr/graph';

// The built-in layout, answered 800 ms late.
class DelayedLayout extends WrGraphLayout {
  private readonly layered = new WrLayeredGraphLayout();

  override layout(input: WrGraphLayoutInput, { signal }: WrGraphLayoutContext): Promise<WrGraphLayoutResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(this.layered.layout(input)), 800);
      // A newer run or the graph's destruction aborts this one.
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      });
    });
  }
}

@Component({
  selector: 'app-review-workflow',
  templateUrl: './review-workflow.html',
  imports: [WrGraph, WrButton],
  providers: [{ provide: WrGraphLayout, useClass: DelayedLayout }],
  styles: \`
    .dimmed {
      opacity: 0.5;
    }
  \`,
})
export class ReviewWorkflow {
  protected readonly nodes = signal<readonly WrGraphNode[]>([
    { id: 'draft', label: 'Draft' },
    { id: 'publish', label: 'Publish' },
  ]);
  protected readonly edges = signal<readonly WrGraphEdge[]>([{ from: 'draft', to: 'publish' }]);

  protected addReview(): void {
    const count = this.nodes().length - 1;
    const id = \`review-\${count}\`;
    this.nodes.update(nodes => [...nodes, { id, label: \`Review \${count}\` }]);
    this.edges.update(edges => [...edges, { from: 'draft', to: id }, { from: id, to: 'publish' }]);
  }

  protected report(error: unknown): void {
    console.error(error);
  }
}`,
    },
    {
      label: 'Worker',
      language: 'typescript',
      code: `import { WrGraphLayout, type WrGraphLayoutContext, type WrGraphLayoutInput, type WrGraphLayoutResult } from 'ngwr/graph';

// layout.worker.ts answers each message with a WrGraphLayoutResult.
export class WorkerLayout extends WrGraphLayout {
  override layout(input: WrGraphLayoutInput, { signal }: WrGraphLayoutContext): Promise<WrGraphLayoutResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./layout.worker', import.meta.url), { type: 'module' });
      const settle = (): void => worker.terminate();
      worker.onmessage = ({ data }: MessageEvent<WrGraphLayoutResult>) => {
        settle();
        resolve(data);
      };
      worker.onerror = event => {
        settle();
        reject(new Error(event.message));
      };
      signal.addEventListener('abort', () => {
        settle();
        reject(signal.reason as Error);
      });
      // The input is plain data, so it crosses to a worker as it is.
      worker.postMessage(input);
    });
  }
}`,
    },
  ];

  protected readonly api = API.WrGraph;

  protected readonly stateRows: readonly DocApiRow[] = [
    {
      name: 'layoutPending()',
      description:
        'Whether an asynchronous layout is running for the current inputs. Always `false` with a synchronous one.',
      type: 'Signal<boolean>',
      default: '—',
    },
  ];

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrGraphNode', description: 'One block. `TData` is whatever `data` carries.', type: 'interface' },
    {
      name: 'id',
      description:
        'Unique within the graph. A repeated id is skipped after its first occurrence, with a warning in dev mode.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'label',
      description: 'The node’s name, read by screen readers; render it in a custom template.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'width',
      description: 'Width in pixels. Falls back to `nodeWidth` when absent, non-finite or not positive.',
      type: 'number',
      sub: true,
    },
    {
      name: 'height',
      description: 'Height in pixels. Falls back to `nodeHeight` when absent, non-finite or not positive.',
      type: 'number',
      sub: true,
    },
    {
      name: 'data',
      description: 'Anything the node template needs. Never read by the graph or its layout.',
      type: 'TData',
      sub: true,
    },
    {
      name: 'WrGraphEdge',
      description: 'A parent-child link; repeated edges and cycles are allowed.',
      type: 'interface',
    },
    {
      name: 'from',
      description:
        'Id of the parent. An edge naming a node that does not exist is skipped, with a warning in dev mode.',
      type: 'string',
      required: true,
      sub: true,
    },
    { name: 'to', description: 'Id of the child.', type: 'string', required: true, sub: true },
    {
      name: 'WrGraphLayout',
      description: 'The layout engine, and its DI token. Provide a subclass to replace the built-in layout.',
      type: 'abstract class',
    },
    {
      name: 'layout(input, context)',
      description:
        'Places `input.nodes` and routes `input.edges`. A Promise is awaited; `context.signal` aborts a run that is no longer wanted.',
      type: 'WrGraphLayoutResult | Promise<WrGraphLayoutResult>',
      required: true,
      sub: true,
    },
    {
      name: 'WrGraphLayoutResult',
      description: 'A finished layout, in pixels from the top-left corner.',
      type: 'interface',
    },
    {
      name: 'nodes',
      description: 'The top-left corner of each node: `{ id, x, y }`.',
      type: 'readonly WrGraphNodePlacement[]',
      required: true,
      sub: true,
    },
    {
      name: 'edges',
      description: 'The line of each edge, parent end first: `{ id, points }` with at least two points.',
      type: 'readonly WrGraphEdgeRoute[]',
      required: true,
      sub: true,
    },
    { name: 'width', description: 'Width of the whole drawing.', type: 'number', required: true, sub: true },
    { name: 'height', description: 'Height of the whole drawing.', type: 'number', required: true, sub: true },
    {
      name: 'WrLayeredGraphLayout',
      description:
        'The built-in layout. `new WrLayeredGraphLayout({ nodeGap, layerGap, edgeGap, componentGap })` sets its spacing.',
      type: 'class',
    },
    {
      name: 'WrGraphNodeContext',
      description: 'What an `ng-template wrGraphNode` receives.',
      type: 'interface',
    },
    {
      name: '$implicit',
      description: 'The node, bound with `let-node`.',
      type: 'WrGraphNode<TData>',
      required: true,
      sub: true,
    },
  ];
}
