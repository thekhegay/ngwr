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
    install: `import { WrLoadingBar, WrLoadingBarComponent } from 'ngwr/loading-bar';

@Component({
  selector: 'app-shell',
  template: \`
    <wr-loading-bar />
    <router-outlet />
  \`,
  imports: [WrLoadingBarComponent, RouterOutlet],
})
export class AppShell {
  // Inject once at the shell so the router subscription kicks in.
  constructor() {
    inject(WrLoadingBar);
  }
}`,

    intercept: `// HttpInterceptor — start a slot per pending HTTP request.
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { WrLoadingBar } from 'ngwr/loading-bar';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const bar = inject(WrLoadingBar);
  bar.start();
  return next(req).pipe(finalize(() => bar.complete()));
};`,

    style: `<!-- Customise color + thickness via attributes. -->
<wr-loading-bar color="var(--wr-color-warning)" height="3px" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'start()',
      description: 'Open a slot. While at least one slot is open, the bar trickles asymptotically toward 90%.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'complete()',
      description: 'Close one slot. When the last closes, the bar fast-forwards to 100% then resets.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'reset()',
      description: 'Abort — clear every slot and hide the bar immediately, without animating to 100%.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'progress',
      description: 'Live progress signal `[0, 1]`. Useful for custom UIs.',
      type: 'Signal<number>',
      default: '0',
    },
    {
      name: 'state',
      description: 'Computed lifecycle: `idle` / `running` / `completing`.',
      type: 'Signal<WrLoadingState>',
      default: "'idle'",
    },
    {
      name: '<wr-loading-bar>',
      description: 'Visual element. Reads the singleton service. Inputs: `color`, `height`.',
      type: 'component',
      default: '—',
    },
  ];
}
