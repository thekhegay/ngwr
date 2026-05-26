import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

interface Breakpoint {
  readonly name: string;
  readonly min: string;
  readonly container: string;
}

@Component({
  selector: 'ngwr-grid-page',
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class GridPageComponent {
  protected readonly breakpoints: readonly Breakpoint[] = [
    { name: 'xs', min: '0', container: '—' },
    { name: 'sm', min: '576px', container: '540px' },
    { name: 'md', min: '768px', container: '720px' },
    { name: 'lg', min: '992px', container: '960px' },
    { name: 'xl', min: '1200px', container: '1140px' },
    { name: 'xxl', min: '1400px', container: '1320px' },
    { name: 'xga', min: '1600px', container: '1530px' },
    { name: 'fhd', min: '1920px', container: '1830px' },
    { name: 'rt', min: '2560px', container: '2470px' },
  ];

  protected readonly cols = [1, 2, 3, 4, 6, 12];

  protected readonly snippets = {
    optIn: `// Grid is opt-in — utilities don't come with the umbrella.
@use 'ngwr/grid';`,
    grid: `<div class="grid">
  <div class="col-12 col-md-6 col-lg-4">A</div>
  <div class="col-12 col-md-6 col-lg-4">B</div>
  <div class="col-12 col-md-12 col-lg-4">C</div>
</div>`,
    container: `<div class="container">…</div>          <!-- full width below sm, then steps up -->
<div class="container-md">…</div>       <!-- fluid below md, then steps up -->
<div class="container-fluid">…</div>    <!-- always 100% width -->`,
    gutter: `:root {
  --wr-grid-gutter: 1.5rem; /* default: 1rem */
}`,
    mediaUp: `@use 'ngwr/breakpoints' as bp;

.card {
  padding: 1rem;

  @include bp.media-up(md) {
    padding: 2rem;
  }

  @include bp.media-down(lg) {
    border-radius: 0;
  }
}`,
  };

  protected colSpan(span: number): number {
    return 12 / span;
  }
}
