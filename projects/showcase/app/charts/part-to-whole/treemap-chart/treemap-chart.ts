import { Component } from '@angular/core';

import { WrTreemapChart, type WrTreemapNode } from 'ngwr/charts/treemap-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-treemap-chart-page',
  templateUrl: './treemap-chart.html',
  imports: [
    WrTreemapChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TreemapChartPageComponent {
  protected readonly budget: readonly WrTreemapNode[] = [
    {
      label: 'Engineering',
      children: [
        { label: 'Platform', value: 420 },
        { label: 'Web', value: 310 },
        { label: 'Mobile', value: 260 },
        { label: 'QA', value: 120 },
      ],
    },
    {
      label: 'Sales',
      children: [
        { label: 'Americas', value: 340 },
        { label: 'EMEA', value: 280 },
        { label: 'APAC', value: 150 },
      ],
    },
    {
      label: 'Marketing',
      children: [
        { label: 'Brand', value: 140 },
        { label: 'Events', value: 90 },
        { label: 'Content', value: 70 },
      ],
    },
    {
      label: 'Operations',
      children: [
        { label: 'IT', value: 110 },
        { label: 'Facilities', value: 80 },
      ],
    },
    { label: 'Legal', value: 60 },
  ];

  protected readonly disk: readonly WrTreemapNode[] = [
    {
      label: 'Photos',
      value: 512,
      children: [
        { label: '2025', value: 220 },
        { label: '2026', value: 180 },
      ],
    },
    { label: 'Videos', value: 380 },
    {
      label: 'Music',
      children: [
        { label: 'Albums', value: 90 },
        { label: 'Podcasts', value: 35 },
      ],
    },
    { label: 'Documents', value: 64 },
  ];

  protected readonly repo: readonly WrTreemapNode[] = [
    {
      label: 'src',
      children: [
        {
          label: 'app',
          children: [
            { label: 'components', value: 180 },
            { label: 'pages', value: 95 },
            { label: 'services', value: 60 },
          ],
        },
        { label: 'lib', value: 140 },
        { label: 'assets', value: 30 },
      ],
    },
    {
      label: 'tests',
      children: [
        { label: 'unit', value: 120 },
        { label: 'e2e', value: 45 },
      ],
    },
    { label: 'docs', value: 70 },
    {
      label: 'scripts',
      children: [
        { label: 'build', value: 12 },
        { label: 'check', value: 9 },
        { label: 'release', value: 6 },
      ],
    },
  ];

  private readonly dollars = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  /** Thousands of dollars, exact: `$1,110K` rather than a compact `$1.1M` the tooltip and table would round. */
  protected readonly usd = (value: number): string => `${this.dollars.format(value)}K`;

  private readonly percents = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 });

  protected readonly percent = (ratio: number): string => this.percents.format(ratio);

  protected readonly snippets = {
    basic: `<wr-treemap-chart ariaLabel="Budget by department" [data]="budget" />`,
    basicTs: `budget: WrTreemapNode[] = [
  {
    label: 'Engineering',
    children: [
      { label: 'Platform', value: 420 },
      { label: 'Web', value: 310 },
      { label: 'Mobile', value: 260 },
      { label: 'QA', value: 120 },
    ],
  },
  // …
  { label: 'Legal', value: 60 },
];`,
    groups: `<wr-treemap-chart ariaLabel="Disk usage, GB" [data]="disk" />`,
    groupsTs: `disk: WrTreemapNode[] = [
  // 512 GB, of which the children account for 400: the rest stays empty.
  {
    label: 'Photos',
    value: 512,
    children: [
      { label: '2025', value: 220 },
      { label: '2026', value: 180 },
    ],
  },
  { label: 'Videos', value: 380 },
  // No value: Music is the sum of its children, 125.
  {
    label: 'Music',
    children: [
      { label: 'Albums', value: 90 },
      { label: 'Podcasts', value: 35 },
    ],
  },
  { label: 'Documents', value: 64 },
];`,
    labels: `<!-- Three levels deep -->
<wr-treemap-chart ariaLabel="Repository by lines of code" [data]="repo" [height]="320" />

<!-- Names only -->
<wr-treemap-chart ariaLabel="Repository by lines of code" [data]="repo" [showValues]="false" />`,
    format: `<wr-treemap-chart
  ariaLabel="Budget by department"
  [data]="budget"
  [valueFormat]="usd"
  [percentFormat]="percent"
/>`,
    formatTs: `dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
usd = (value: number) => \`\${this.dollars.format(value)}K\`; // $1,110K

// A ratio in, as Intl's percent style takes it: 0.25 is a quarter.
percents = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 });
percent = (ratio: number) => this.percents.format(ratio);`,
    rtl: `<div dir="rtl">
  <wr-treemap-chart ariaLabel="Budget by department" [data]="budget" />
</div>`,
    dataTable: `<wr-treemap-chart ariaLabel="Budget by department" valueLabel="Budget, $K" [data]="budget" dataTable />`,
  };

  protected readonly typeSnippet = `interface WrTreemapNode {
  label: string;
  value?: number;
  children?: readonly WrTreemapNode[];
  color?: string;
}`;

  protected readonly api = API.WrTreemapChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrTreemapNode', description: 'A leaf, or a group drawn round its children.', type: 'interface' },
    {
      name: 'label',
      description: 'Tile, tooltip path and table row name.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'value',
      description:
        "A leaf's area. On a group, defaults to the children's sum; a larger value leaves the rest of the group empty.",
      type: 'number',
      sub: true,
    },
    { name: 'children', description: 'The nodes drawn inside this one.', type: 'readonly WrTreemapNode[]', sub: true },
    {
      name: 'color',
      description: 'CSS colour for this node and everything inside it.',
      type: 'string',
      default: 'palette',
      sub: true,
    },
  ];
}
