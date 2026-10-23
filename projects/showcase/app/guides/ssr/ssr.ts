import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

/** One row of the "what the server can answer" table. */
interface ServerAnswer {
  readonly api: string;
  readonly server: string;
}

@Component({
  selector: 'ngwr-ssr-page',
  templateUrl: './ssr.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class SsrGuidePage {
  protected readonly answers: readonly ServerAnswer[] = [
    { api: 'WrPlatform.isBrowser / isServer', server: 'false / true' },
    { api: 'WrPlatform.userAgent', server: 'null' },
    { api: 'WrPlatform.prefersDark()', server: 'false' },
    { api: 'WrTheme.resolved()', server: "'light' with the default config" },
    { api: 'WrStorage.get(key, fallback)', server: 'the fallback' },
    { api: 'WrHaptics.supported', server: 'false' },
    { api: 'WrTour.start(steps)', server: 'does nothing' },
  ];

  protected readonly snippets = {
    hydration: `import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
  ],
});`,

    incremental: `<!-- Server-rendered as usual; only the JavaScript waits. -->
@defer (hydrate on viewport) {
  <section class="marketing">
    <wr-blur-text text="Everything below the fold" />
  </section>
}`,

    tbody: `<!-- Wrong: hydration fails with NG0501 -->
<table>
  @for (row of rows(); track row.id) {
    <tr>…</tr>
  }
</table>

<!-- Right -->
<table>
  <tbody>
    @for (row of rows(); track row.id) {
      <tr>…</tr>
    }
  </tbody>
</table>`,

    layout: `<!-- Right: one DOM on both sides -->
<wr-table responsive [columns]="cols" [items]="rows" />
<wr-pagination responsive [(page)]="page" [total]="total()" />

<!-- Wrong: the server always renders the narrow branch -->
@if (isMd()) {
  <aside class="filters">…</aside>
}`,

    overlayGuard: `import { afterNextRender, inject } from '@angular/core';
import { WrToast } from 'ngwr/toast';

export class Welcome {
  private readonly toast = inject(WrToast);

  constructor() {
    afterNextRender(() => this.toast.show({ message: 'Welcome back' }));
  }
}`,

    virtual: `<wr-table
  virtualScroll
  [viewportHeight]="400"
  [rowHeight]="40"
  [columns]="cols"
  [items]="rows"
/>`,

    theme: `import { wrThemePrePaintScript } from 'ngwr/theme';

// In <head>, above every stylesheet.
const html = template.replace('<!--theme-->', \`<script>\${wrThemePrePaintScript()}</script>\`);`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/reference/services', 'theme'],
      description: 'Pre-paint script options.',
    },
    {
      kind: 'Service',
      title: 'WrPlatform',
      url: ['/reference/services', 'platform'],
      description: 'Browser and server guards.',
    },
    {
      kind: 'Guide',
      title: 'Mobile & responsive',
      url: ['/guides', 'mobile'],
      description: 'Container-query reflow.',
    },
  ];
}
