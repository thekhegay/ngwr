import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-mobile-page',
  templateUrl: './mobile.html',
  imports: [RouterLink, WrTypography, DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class MobilePageComponent {
  protected readonly snippets = {
    overlaysProvider: `import { provideWrOverlay, provideWrResponsiveOverlays } from 'ngwr/overlay';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrOverlay(),
    // App-wide opt-in: on viewports at or below the breakpoint, dialog /
    // select / dropdown / popover collapse to a bottom-sheet, and the
    // command-palette goes full-screen. Defaults to 640px.
    provideWrResponsiveOverlays({ breakpoint: 640 }),
  ],
});`,
    overlaysInput: `<!-- Or opt in one overlay at a time, without the global provider -->
<wr-select responsive [(value)]="size">…</wr-select>

// Dialog is service-opened, so pass it as an option:
this.dialog.open(EditProfile, { responsive: true });`,
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
    swipe: `<!-- Drawer: render a grab handle, then drag it toward the edge to close -->
<wr-drawer position="bottom" showHandle>…</wr-drawer>

<!-- The rest is automatic — no input needed:
       lightbox   swipe down       → close
       toast      swipe sideways   → dismiss
       carousel   swipe left/right → change slide -->`,
    safeArea: `<!-- Edge-anchored drawers can pad the system safe-area inset -->
<wr-drawer position="bottom" safeArea>…</wr-drawer>`,
    media: `import { inject } from '@angular/core';
import { WrMedia } from 'ngwr/media';

export class Toolbar {
  private readonly media = inject(WrMedia);

  // Signals — recompute when the viewport crosses a breakpoint.
  protected readonly isMd = this.media.matches('md');
  protected readonly isWide = this.media.matches('(min-width: 1200px)');
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
