import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

/** One row of the "when narrow" table. */
interface Reflow {
  readonly component: string;
  readonly narrow: string;
}

@Component({
  selector: 'ngwr-mobile-page',
  templateUrl: './mobile.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class MobilePageComponent {
  protected readonly reflows: readonly Reflow[] = [
    { component: 'wr-descriptions', narrow: 'Columns stack.' },
    { component: 'wr-stepper', narrow: 'Turns vertical.' },
    { component: 'wr-page-header', narrow: 'Actions move below the title.' },
    { component: 'wr-toolbar', narrow: 'Wraps.' },
    { component: 'wr-pagination', narrow: 'Collapses to current / total.' },
    { component: 'wr-table', narrow: 'Rows become labelled cards.' },
    { component: 'wr-tabs', narrow: 'Scrolls with an edge fade. No flag needed.' },
  ];

  protected readonly snippets = {
    containerQuery: `<wr-descriptions responsive inline bordered>…</wr-descriptions>
<wr-stepper responsive>…</wr-stepper>
<wr-page-header responsive title="Settings">…</wr-page-header>
<wr-toolbar responsive>…</wr-toolbar>
<wr-pagination responsive [(page)]="page" [total]="200" />
<wr-table responsive [columns]="cols" [items]="rows" />`,
    density: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';

// App-wide: sm | md | lg | touch
provideWr(withDensity({ defaultDensity: 'touch' }));

// One subtree: <section wrDensity="touch">…</section>`,
    safeArea: `<wr-drawer position="bottom" safeArea>…</wr-drawer>`,
    mediaScss: `@use 'ngwr/breakpoints' as bp;

.toolbar {
  flex-direction: column;

  @include bp.media-up(md) {
    flex-direction: row;
  }
}`,
    media: `import { BreakpointObserver } from '@angular/cdk/layout';
import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

export class Toolbar {
  private readonly breakpoints = inject(BreakpointObserver);

  // 768px is the \`md\` breakpoint in ngwr/breakpoints.
  protected readonly isMd = toSignal(
    this.breakpoints.observe('(min-width: 768px)').pipe(map(state => state.matches)),
    { initialValue: false }
  );
}`,
  };
}
