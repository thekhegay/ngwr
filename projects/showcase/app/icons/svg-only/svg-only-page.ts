/**
 * Shared page component for SVG-only icon sources (Tabler, Phosphor,
 * Heroicons, Iconoir, Radix, Bootstrap). Each route binds the specific
 * `name`, `install`, `import` snippet, and homepage link.
 *
 * Browsing actual icons happens on the upstream catalog — we deliberately
 * don't bundle 30k SVGs into the showcase. The page documents the wiring
 * + links out.
 */

import { Component, type Type, input } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

export interface SvgOnlySpec {
  readonly title: string;
  readonly description: string;
  readonly install: string;
  readonly homepage: string;
  readonly imports: { readonly bash: string; readonly ts: string };
  readonly count?: number;
}

@Component({
  selector: 'ngwr-icons-svg-only-page',
  templateUrl: './svg-only-page.html',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent],
})
export class SvgOnlyPage {
  readonly spec = input.required<SvgOnlySpec>();
}

/** Factory — produce a small page component that just binds the spec. */
export function svgOnlyPage(spec: SvgOnlySpec): Type<unknown> {
  @Component({
    selector: 'ngwr-icons-svg-only-binding',
    template: `<ngwr-icons-svg-only-page [spec]="spec" />`,
    imports: [SvgOnlyPage],
  })
  class BindingPage {
    protected readonly spec = spec;
  }
  return BindingPage;
}
