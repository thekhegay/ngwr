import { Component, resource, signal, untracked } from '@angular/core';

import { WrAlert } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { WrEmpty } from 'ngwr/empty';
import { WrList, WrListItem } from 'ngwr/list';
import {
  WrLoadState,
  WrLoadStateContent,
  WrLoadStateEmpty,
  WrLoadStateError,
  WrLoadStateLoading,
  type WrLoadStateStatus,
} from 'ngwr/load-state';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrSpinner } from 'ngwr/spinner';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

interface Order {
  readonly id: string;
  readonly total: string;
}

/** What the fake loader answers next: rows, nothing, or a failure. */
type Outcome = 'rows' | 'empty' | 'fail';

const ORDERS: readonly Order[] = [
  { id: '#1042', total: '$128.00' },
  { id: '#1043', total: '$54.20' },
  { id: '#1044', total: '$310.75' },
];

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

@Component({
  selector: 'ngwr-load-state-page',
  templateUrl: './load-state.html',
  imports: [
    WrLoadState,
    WrLoadStateContent,
    WrLoadStateLoading,
    WrLoadStateError,
    WrLoadStateEmpty,
    WrAlert,
    WrButton,
    WrEmpty,
    WrList,
    WrListItem,
    WrSegmented,
    WrSpinner,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class LoadStatePageComponent {
  /** The next load's answer. Read once per load, so a reload picks up the latest choice. */
  protected readonly outcome = signal<Outcome>('rows');

  protected readonly orders = resource<readonly Order[], unknown>({
    loader: async () => {
      await wait(900);
      const outcome = untracked(this.outcome);
      if (outcome === 'fail') throw new Error('Gateway timeout');
      return outcome === 'empty' ? [] : ORDERS;
    },
  });

  protected reload(outcome: Outcome): void {
    this.outcome.set(outcome);
    this.orders.reload();
  }

  protected readonly status = signal<WrLoadStateStatus>('ready');
  protected readonly templatesStatus = signal<WrLoadStateStatus>('error');
  protected readonly statusOptions: readonly WrSegmentedOption<WrLoadStateStatus>[] = [
    { value: 'loading', label: 'loading' },
    { value: 'error', label: 'error' },
    { value: 'empty', label: 'empty' },
    { value: 'ready', label: 'ready' },
  ];

  /** The status demo's retry: a load that lands a moment later. */
  protected async retry(target: 'status' | 'templatesStatus'): Promise<void> {
    this[target].set('loading');
    await wait(900);
    this[target].set('ready');
  }

  protected readonly snippets = {
    resource: `import { httpResource } from '@angular/common/http';

@Component({
  imports: [WrLoadState, WrLoadStateContent, WrList, WrListItem],
  template: \`
    <wr-load-state [resource]="orders">
      <ng-template wrLoadStateContent [wrLoadStateContentOf]="orders" let-orders>
        <wr-list>
          @for (order of orders; track order.id) {
            <wr-list-item>{{ order.id }}</wr-list-item>
          }
        </wr-list>
      </ng-template>
    </wr-load-state>
  \`,
})
export class Orders {
  readonly orders = httpResource<Order[]>(() => '/api/orders');
}`,
    status: `<wr-load-state [status]="status()" (retry)="load()">
  <ng-template wrLoadStateContent>Loaded.</ng-template>
</wr-load-state>`,
    templates: `<wr-load-state [resource]="orders">
  <ng-template wrLoadStateLoading><wr-spinner /></ng-template>
  <ng-template wrLoadStateError let-error let-retry="retry" let-retrying="retrying">
    <wr-alert type="danger" title="Could not load orders" [message]="error.message">
      <wr-btn wrAlertActions size="sm" [loading]="retrying" (click)="retry()">Try again</wr-btn>
    </wr-alert>
  </ng-template>
  <ng-template wrLoadStateEmpty>
    <wr-empty title="No orders yet"><wr-btn wrEmptyActions size="sm">Create one</wr-btn></wr-empty>
  </ng-template>
  <ng-template wrLoadStateContent [wrLoadStateContentOf]="orders" let-orders>...</ng-template>
</wr-load-state>`,
    isEmpty: `<wr-load-state [resource]="page" [isEmpty]="v => !v || v.items.length === 0">`,
  };

  protected readonly api = API.WrLoadState;

  protected readonly templatesApi: readonly DocApiRow[] = [
    {
      name: '[wrLoadStateContent]',
      description: 'On an `<ng-template>`: the content, created once ready. Import `WrLoadStateContent`.',
      type: 'directive',
      default: '-',
    },
    {
      name: '[wrLoadStateContentOf]',
      description:
        'The resource, for the type checker only: types `let-value`. Bind the same resource as `[resource]`.',
      type: 'Resource<T | undefined> | null | undefined',
      sub: true,
    },
    {
      name: 'let-value',
      description: "The resource's value. `undefined` when driven by `status`.",
      type: 'T',
      default: '-',
      sub: true,
    },
    {
      name: 'let-reloading="reloading"',
      description: 'A reload is in flight behind the content.',
      type: 'boolean',
      default: '-',
      sub: true,
    },
    {
      name: '[wrLoadStateLoading]',
      description: 'On an `<ng-template>`: replaces the default skeleton. Import `WrLoadStateLoading`.',
      type: 'directive',
      default: '-',
    },
    {
      name: '[wrLoadStateError]',
      description: 'On an `<ng-template>`: replaces the default failure. Import `WrLoadStateError`.',
      type: 'directive',
      default: '-',
    },
    {
      name: 'let-error',
      description: '`resource.error()`. `undefined` when driven by `status`.',
      type: 'Error | undefined',
      default: '-',
      sub: true,
    },
    {
      name: 'let-retry="retry"',
      description: 'Reloads the resource and emits `retry`. Does nothing while one is in flight.',
      type: '() => void',
      default: '-',
      sub: true,
    },
    {
      name: 'let-retrying="retrying"',
      description: 'A retry is in flight.',
      type: 'boolean',
      default: '-',
      sub: true,
    },
    {
      name: '[wrLoadStateEmpty]',
      description: 'On an `<ng-template>`: replaces the default `<wr-empty>`. Import `WrLoadStateEmpty`.',
      type: 'directive',
      default: '-',
    },
  ];
}
