import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPullToRefresh } from 'ngwr/pull-to-refresh';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-pull-to-refresh-page',
  templateUrl: './pull-to-refresh.html',
  imports: [
    WrPullToRefresh,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PullToRefreshPageComponent {
  protected readonly loading = signal(false);
  protected readonly items = signal<string[]>(['Aurora', 'Borealis', 'Cascade', 'Drift', 'Ember', 'Fathom']);

  private counter = 0;

  protected reload(): void {
    if (this.loading()) return;
    this.loading.set(true);
    // Simulate an async fetch, then close the indicator by clearing `refreshing`.
    setTimeout(() => {
      this.items.update(list => [`Fresh row ${++this.counter}`, ...list].slice(0, 8));
      this.loading.set(false);
    }, 1200);
  }

  protected readonly htmlSnippet = `<wr-pull-to-refresh
  style="height: 16rem"
  [refreshing]="loading()"
  (refresh)="reload()"
>
  @for (item of items(); track item) {
    <div class="row">{{ item }}</div>
  }
</wr-pull-to-refresh>`;

  protected readonly tsSnippet = `protected readonly loading = signal(false);

reload(): void {
  this.loading.set(true);
  this.api.fetch().subscribe((rows) => {
    this.items.set(rows);
    this.loading.set(false);   // clearing \`refreshing\` closes the indicator
  });
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'refreshing',
      description:
        'Whether a refresh is in flight — drives the spinner. Set true in `refresh`, false when it resolves.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'threshold',
      description: 'Pull distance (px) a release must reach to trigger.',
      type: 'number',
      default: '64',
    },
    { name: 'disabled', description: 'Disable the gesture entirely.', type: 'boolean', default: 'false' },
    {
      name: 'refresh',
      description: 'Fires when the user pulls past `threshold` and releases.',
      type: 'output<void>',
      default: '—',
    },
  ];
}
