import { Component } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';
import { WrGraph, WrGraphNodeTemplate, type WrGraphEdge, type WrGraphNode } from 'ngwr/graph';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
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

@Component({
  selector: 'ngwr-graph-page',
  templateUrl: './graph.html',
  styleUrl: './graph.scss',
  imports: [
    WrGraph,
    WrGraphNodeTemplate,
    WrAvatar,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
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

  protected readonly snippets = {
    install: `import { WrGraph, WrGraphNodeTemplate } from 'ngwr/graph';

// WrGraphNodeTemplate is the <ng-template wrGraphNode> directive in the custom
// node examples below — the selector is wrGraphNode, and imports: [] takes the
// class. A graph that draws its default cards needs WrGraph alone.
@Component({ imports: [WrGraph, WrGraphNodeTemplate] })
export class MyComponent {}`,
    styles: `@use 'ngwr/graph';`,
    a11y: `<!-- What the team structure above exposes. The SVG holding the lines is aria-hidden,
     and each <span> is visually hidden. -->
<div role="group" tabindex="0" aria-label="Team structure">
  <div role="list">
    <div role="listitem">Platform <span>Children: Mira Okafor and Tomas Lindqvist.</span></div>
    <!-- … -->
    <div role="listitem">Noor Haddad Product designer <span>Parents: Design and Research.</span></div>
    <!-- … -->
    <div role="listitem">Dev Sandoval Engineer <span>Parents: Mira Okafor and Tomas Lindqvist.</span></div>
  </div>
</div>`,
  };

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
      border: 1px solid var(--wr-color-outline);
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
      border: 1px solid var(--wr-color-outline);
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

  protected readonly api = API.WrGraph;

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
      description:
        'The node’s name. The default card shows it, and every neighbour’s relation text reads it out — so a custom template should render it too.',
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
      description:
        'A parent-child link, drawn with its arrow at the child. Several edges between one pair, and edges that close a cycle, are both legal.',
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
