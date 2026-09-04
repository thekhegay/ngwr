import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

/** One row of the "what the server can answer" table. */
interface ServerAnswer {
  readonly api: string;
  readonly server: string;
  readonly client: string;
}

@Component({
  selector: 'ngwr-ssr-page',
  templateUrl: './ssr.html',
  imports: [RouterLink, WrTypography, DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class SsrGuidePage {
  /**
   * Every value here is read off the library rather than remembered: each row
   * names an API whose source has an explicit `isPlatformBrowser` branch (or,
   * for the two that do not, says so).
   */
  protected readonly answers: readonly ServerAnswer[] = [
    {
      api: 'WrMedia.matches(q)',
      server: 'always false — there is no matchMedia to ask',
      client: 'the real match, and it keeps updating',
    },
    {
      api: 'WrMedia.current()',
      server: "'xs' — the walk from xxl down finds no match and falls through",
      client: 'the real breakpoint',
    },
    {
      api: 'WrPlatform.isBrowser / isServer',
      server: 'false / true',
      client: 'true / false',
    },
    {
      api: 'WrPlatform.userAgent',
      server: 'null',
      client: 'navigator.userAgent',
    },
    {
      api: 'WrPlatform.prefersDark()',
      server: 'false',
      client: 'the OS preference',
    },
    {
      api: 'WrTheme.resolved()',
      server: "'light' under the default config — no localStorage, no prefers-color-scheme",
      client: 'the persisted or preferred theme',
    },
    {
      api: 'WrStorage.get(k, fallback)',
      server: 'the fallback — the engine token resolves to an in-memory map per request',
      client: 'localStorage',
    },
    {
      api: 'WrHaptics.supported',
      server: 'false',
      client: 'whether navigator.vibrate exists',
    },
    {
      api: 'WrTour.start(steps)',
      server: 'no-op, by an explicit guard',
      client: 'starts the tour',
    },
    {
      api: 'WrToast.show(…)',
      server: 'NOT a no-op — it attaches a real overlay into the server DOM',
      client: 'shows the toast',
    },
    {
      api: 'WrDialog.open(…)',
      server: 'NOT a no-op — attaches, but skips role, aria-modal, the ✕ and the focus trap',
      client: 'opens a decorated, focus-trapped dialog',
    },
  ];

  protected readonly snippets = {
    hydration: `import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideWrOverlay(),
    provideWrTheme(),
  ],
});`,

    tbody: `<!-- WRONG under hydration: the HTML parser inserts an implicit <tbody>
     around these rows, so the live DOM stops matching what the server
     wrote and hydration walks off the end of the table (NG0501). -->
<table>
  @for (row of rows(); track row.id) {
    <tr>…</tr>
  }
</table>

<!-- RIGHT: write the section element yourself. -->
<table>
  <tbody>
    @for (row of rows(); track row.id) {
      <tr>…</tr>
    }
  </tbody>
</table>`,

    layout: `<!-- Server-safe: one DOM in both places. The reflow is a CONTAINER QUERY in
     CSS, resolved by the browser after the markup has already matched. -->
<wr-table responsive [columns]="cols" [items]="rows" />
<wr-pagination responsive [(page)]="page" [total]="total()" />

<!-- Server-hostile: WrMedia answers false on the server, so the prerendered
     HTML is always the narrow branch and the wide one appears only after
     hydration has swapped the subtree out. -->
@if (media.matches('md')()) {
  <aside class="filters">…</aside>
}`,

    overlayGuard: `import { afterNextRender, inject, Injector } from '@angular/core';
import { WrToast } from 'ngwr/toast';

private readonly toast = inject(WrToast);
private readonly injector = inject(Injector);

// Neither WrToast nor WrDialog guards the platform for you: called during a
// server render they attach an overlay that is serialized into the response
// and shipped to every visitor of a cached page. Open them from a
// browser-only hook.
constructor() {
  afterNextRender(() => this.toast.show({ message: 'Welcome back' }), { injector: this.injector });
}`,

    theme: `import { wrThemePrePaintScript } from 'ngwr/theme';

// Emit into <head>, above every stylesheet.
const html = template.replace('<!--theme-->', \`<script>\${wrThemePrePaintScript()}</script>\`);`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/reference/services', 'theme'],
      description: 'The pre-paint script that closes the light-theme flash, with its options.',
    },
    {
      kind: 'Service',
      title: 'WrMedia',
      url: ['/reference/services', 'media'],
      description: 'Breakpoint signals — the API this page says answers `false` on the server.',
    },
    {
      kind: 'Service',
      title: 'WrPlatform',
      url: ['/reference/services', 'platform'],
      description: '`isBrowser` / `isServer` / `userAgent` — the guard the rest of this page relies on.',
    },
    {
      kind: 'Guide',
      title: 'Mobile & responsive',
      url: ['/guides', 'mobile'],
      description: 'The container-query modifiers that reflow without asking the viewport.',
    },
  ];
}
