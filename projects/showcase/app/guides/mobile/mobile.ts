import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-mobile-page',
  templateUrl: './mobile.html',
  imports: [RouterLink, DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class MobilePageComponent {
  protected readonly snippets = {
    containerQuery: `<!-- Reflows on its OWN width (a container query), not the viewport — so it
     adapts inside a narrow card or split pane even on a wide screen. -->
<wr-descriptions responsive inline bordered>…</wr-descriptions>
<wr-stepper responsive>…</wr-stepper>
<wr-page-header responsive title="Settings">…</wr-page-header>
<wr-toolbar responsive>…</wr-toolbar>
<wr-pagination responsive [(page)]="page" [total]="200" />
<wr-table responsive [columns]="cols" [items]="rows" />`,
    density: `import { provideWrDensity } from 'ngwr/density';

// App-wide default — sm | md | lg | touch.
provideWrDensity({ defaultDensity: 'touch' });

// …or scope it to a subtree with the directive:
// <section wrDensity="touch">…</section>`,
    swipe: `<!-- Automatic — no input needed:
       lightbox   swipe down       → close
       toast      swipe sideways   → dismiss
       carousel   swipe left/right → change slide -->`,
    safeArea: `<!-- Edge-anchored drawers can pad the system safe-area inset -->
<wr-drawer position="bottom" safeArea>…</wr-drawer>`,
    media: `import { BreakpointObserver } from '@angular/cdk/layout';
import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

export class Toolbar {
  private readonly breakpoints = inject(BreakpointObserver);

  // Signals — recompute when the viewport crosses the width. 768px is the
  // \`md\` key of the SCSS breakpoint map, so the two agree.
  protected readonly isMd = toSignal(
    this.breakpoints.observe('(min-width: 768px)').pipe(map(state => state.matches)),
    { initialValue: false }
  );
}`,

    mediaSsr: `<!-- Reflows in CSS. Same markup on the server and in the browser, so
     hydration matches and nothing jumps. -->
<wr-table responsive [columns]="cols" [items]="rows" />

<!-- Branches in the template. \`isMd()\` is false on the server, so the
     prerendered HTML is always the narrow arm and the aside appears only
     once the bundle has booted. -->
@if (isMd()) {
  <aside class="filters">…</aside>
}`,
  };
}
