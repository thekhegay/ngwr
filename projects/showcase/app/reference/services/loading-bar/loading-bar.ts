import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrLoadingBar } from 'ngwr/loading-bar';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-loading-bar-page',
  templateUrl: './loading-bar.html',
  imports: [
    DecimalPipe,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class LoadingBarServicePage {
  protected readonly bar = inject(WrLoadingBar);

  protected start(): void {
    this.bar.start();
  }

  protected complete(): void {
    this.bar.complete();
  }

  protected fake(): void {
    this.start();
    setTimeout(() => this.complete(), 1500);
  }

  protected readonly snippets = {
    intercept: `import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { WrLoadingBar } from 'ngwr/loading-bar';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const bar = inject(WrLoadingBar);
  bar.start();
  return next(req).pipe(finalize(() => bar.complete()));
};`,

    router: `import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';

providers: [provideRouter(routes), provideWrLoadingBarRouter()],`,

    style: `<wr-loading-bar color="var(--wr-color-warning)" height="3px" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WrLoadingBar',
      description: 'Injectable service.',
      type: 'service',
      default: '—',
    },
    {
      name: 'start()',
      description: 'Open a slot. The bar creeps toward 90% while any slot is open.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: 'complete()',
      description: 'Close a slot. The last one fills the bar and hides it.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: 'reset()',
      description: 'Clear every slot and hide the bar at once.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: 'progress',
      description: 'Progress from 0 to 1, for a custom indicator.',
      type: 'Signal<number>',
      default: '0',
      sub: true,
    },
    {
      name: 'state',
      description: '`idle`, `running` or `completing`.',
      type: 'Signal<WrLoadingState>',
      default: "'idle'",
      sub: true,
    },
    {
      name: '<wr-loading-bar>',
      description: 'The bar itself.',
      type: 'component',
      default: '—',
    },
    {
      name: 'color',
      description: 'Bar colour — any CSS colour value.',
      type: 'string',
      default: "'var(--wr-color-primary)'",
      sub: true,
    },
    { name: 'height', description: 'Bar height.', type: 'string', default: "'2px'", sub: true },
  ];
}
