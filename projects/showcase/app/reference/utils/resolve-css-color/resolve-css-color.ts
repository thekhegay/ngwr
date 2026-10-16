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
    // Browser only: after render, never during a server render.
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resolved against the canvas, so the colour scheme and any token
      // override on an ancestor apply as they would to the canvas itself.
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
// 'color(srgb … / 0.2)' — channels 0–1, which fillStyle accepts as it is

resolveCssColor(canvas, 'var(--not-set-anywhere)', '#0f172a');
// '#0f172a' — the fallback`;

  protected readonly whySnippet = `// Native — none of these hands a canvas something it can paint.
ctx.fillStyle = 'var(--wr-color-primary)';   // refused: a canvas reads no CSS
ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--wr-color-primary');
// 'light-dark(#3969e2, #3567ff)' — the declared text, unresolved

// ngwr — the cascade resolves it, for the element you draw on.
ctx.fillStyle = resolveCssColor(canvas, 'var(--wr-color-primary)', '#3969e2');`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'resolveCssColor(context, expression, fallback)',
      description:
        'Resolves a CSS colour expression — a literal, `var()`, `light-dark()`, `color-mix()` — against `context` to the colour the cascade computes there: `rgb()` / `rgba()`, or `color(srgb …)` for a mix. Returns `fallback` when the expression does not parse, names a custom property set nowhere, or the element has no style engine behind it.',
      type: '(context: Element, expression: string, fallback: string) => string',
      default: '—',
    },
  ];
}
