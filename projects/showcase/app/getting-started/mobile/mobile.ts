import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-mobile-page',
  templateUrl: './mobile.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
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
<wr-select responsive [(ngModel)]="size">…</wr-select>

// Dialog is service-opened, so pass it as an option:
this.dialog.open(EditProfile, { responsive: true });`,
    containerQuery: `<!-- Reflows on its OWN width (a container query), not the viewport — so it
     adapts inside a narrow card or split pane even on a wide screen. -->
<wr-descriptions responsive inline bordered>…</wr-descriptions>
<wr-stepper responsive>…</wr-stepper>
<wr-page-header responsive title="Settings">…</wr-page-header>
<wr-toolbar responsive>…</wr-toolbar>
<wr-pagination responsive [(currentPage)]="page" [total]="200" />
<wr-table responsive [columns]="cols" [items]="rows" />`,
    density: `import { provideWrDensity } from 'ngwr/density';

// App-wide default — compact | default | comfortable | touch.
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
  };
}
