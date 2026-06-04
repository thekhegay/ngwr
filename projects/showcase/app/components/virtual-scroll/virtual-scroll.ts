import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrVirtualScroll } from 'ngwr/virtual-scroll';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
} from '#core/components';

interface Row {
  readonly id: number;
  readonly label: string;
}

@Component({
  selector: 'ngwr-virtual-scroll-page',
  templateUrl: './virtual-scroll.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrVirtualScroll,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class VirtualScrollPage {
  protected readonly count = signal(10_000);
  protected readonly itemSize = signal(32);
  protected readonly height = signal(320);

  protected readonly rows = computed<readonly Row[]>(() =>
    Array.from({ length: this.count() }, (_, i) => ({ id: i, label: `Row #${i + 1}` }))
  );

  protected readonly snippet = computed(
    () =>
      `<wr-virtual-scroll
  [items]="rows"
  [itemSize]="${this.itemSize()}"
  [height]="${this.height()}"
>
  <ng-template let-row let-i="index">
    <div>{{ i + 1 }}. {{ row.label }}</div>
  </ng-template>
</wr-virtual-scroll>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Items', signal: this.count, min: 100, max: 100_000, step: 100 },
    { kind: 'slider', label: 'Row Height (px)', signal: this.itemSize, min: 20, max: 80, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Viewport (px)', signal: this.height, min: 200, max: 600, step: 20, unit: 'px' },
  ];

  protected readonly snippets = {
    install: `import { WrVirtualScroll } from 'ngwr/virtual-scroll';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'items',
      description: 'Items to render. The same array reference triggers no re-layout.',
      type: 'readonly T[]',
      default: '— (required)',
      required: true,
    },
    {
      name: 'itemSize',
      description: 'Per-row pixel height. All rows must share this height.',
      type: 'number',
      default: '32',
    },
    {
      name: 'height',
      description: 'Viewport height — number = px, or any CSS length string.',
      type: 'number | string',
      default: '256',
    },
    {
      name: 'minBufferPx',
      description: 'Pixels of rendered content kept above + below the viewport.',
      type: 'number',
      default: 'itemSize * 4',
    },
    {
      name: 'maxBufferPx',
      description: 'Maximum buffered pixels before recycling rows.',
      type: 'number',
      default: 'itemSize * 8',
    },
    {
      name: 'trackBy',
      description: '`trackBy` for the inner `*cdkVirtualFor`.',
      type: 'TrackByFunction<T>',
      default: 'identity',
    },
    {
      name: 'scrollToIndex(i, behavior?)',
      description: 'Programmatically scroll an index into view.',
      type: '(i: number, b?: ScrollBehavior) => void',
      default: '—',
    },
    {
      name: 'scrollToOffset(px, behavior?)',
      description: 'Scroll to a pixel offset.',
      type: '(px: number, b?: ScrollBehavior) => void',
      default: '—',
    },
    {
      name: 'checkViewportSize()',
      description: 'Force a viewport size recheck (after host resize outside ResizeObserver).',
      type: '() => void',
      default: '—',
    },
  ];
}
