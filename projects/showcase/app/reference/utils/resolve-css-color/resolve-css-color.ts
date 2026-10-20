import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-resolve-css-color-page',
  templateUrl: './resolve-css-color.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ResolveCssColorPage {
  protected readonly snippet = `import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';
import { resolveCssColor } from 'ngwr/utils';

@Component({
  selector: 'app-swatch',
  template: '<canvas #canvas width="240" height="48"></canvas>',
})
export class Swatch {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = resolveCssColor(canvas, 'var(--wr-color-primary)', '#3969e2');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }
}`;

  protected readonly formsSnippet = `resolveCssColor(canvas, '#3969e2', '#000');
// 'rgb(57, 105, 226)'

resolveCssColor(canvas, 'light-dark(#ffffff, #0b1120)', '#fff');
// whichever side is in effect on the canvas

resolveCssColor(canvas, 'color-mix(in srgb, var(--wr-color-primary) 20%, transparent)', '#0000');
// 'color(srgb … / 0.2)'

resolveCssColor(canvas, 'var(--not-set-anywhere)', '#0f172a');
// '#0f172a' — the fallback`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'resolveCssColor(context, expression, fallback)',
      description:
        'Resolves `expression` against `context` to `rgb()`, `rgba()` or, for a mix, `color(srgb …)`. Returns `fallback` when it does not parse or names a custom property that is not set.',
      type: '(context: Element, expression: string, fallback: string) => string',
      default: '—',
    },
  ];
}
