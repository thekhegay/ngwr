import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-resolve-css-color-page',
  templateUrl: './wr-resolve-css-color.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrResolveCssColorPage {
  protected readonly snippet = `import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';
import { wrResolveCssColor } from 'ngwr/utils';

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

      ctx.fillStyle = wrResolveCssColor(canvas, 'var(--wr-color-primary)', '#3969e2');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }
}`;

  protected readonly formsSnippet = `wrResolveCssColor(canvas, '#3969e2', '#000');
// 'rgb(57, 105, 226)'

wrResolveCssColor(canvas, 'light-dark(#ffffff, #0b1120)', '#fff');
// whichever side is in effect on the canvas

wrResolveCssColor(canvas, 'color-mix(in srgb, var(--wr-color-primary) 20%, transparent)', '#0000');
// 'color(srgb … / 0.2)'

wrResolveCssColor(canvas, 'var(--not-set-anywhere)', '#0f172a');
// '#0f172a' — the fallback`;

  protected readonly channelsSnippet = `import { wrResolveCssColorChannels } from 'ngwr/utils';

const [r, g, b] = wrResolveCssColorChannels(canvas, 'var(--wr-color-primary)', '#3969e2');
gl.uniform3f(tint, r, g, b);

wrResolveCssColorChannels(canvas, 'oklch(0.7 0.15 250)', '#000');
// another colour space is mixed into sRGB first

wrResolveCssColorChannels(canvas, 'not-a-colour', 'neither-is-this');
// [0, 0, 0]`;

  protected readonly schemeSnippet = `import { afterNextRender } from '@angular/core';
import { wrResolveCssColor, wrWatchColorScheme } from 'ngwr/utils';

constructor() {
  afterNextRender(() => this.draw());
  // A canvas keeps the pixels it was given: draw again when the scheme switches.
  wrWatchColorScheme(() => this.draw());
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrResolveCssColor(context, expression, fallback)',
      description:
        'Resolves `expression` against `context` to `rgb()`, `rgba()` or, for a mix, `color(srgb …)`. Returns `fallback` when it does not parse, or is a lone `var()` whose property holds no colour or, with no fallback of its own, is not set.',
      type: '(context: Element, expression: string, fallback: string) => string',
      default: '—',
    },
    {
      name: 'wrResolveCssColorChannels(context, expression, fallback)',
      description:
        'Resolves `expression` against `context` to 0–1 sRGB channels with the alpha dropped. Reads `fallback`, a literal colour, when it cannot, and returns `[0, 0, 0]` when that cannot be read either.',
      type: '(context: Element, expression: string, fallback: string) => [number, number, number]',
      default: '—',
    },
    {
      name: 'wrWatchColorScheme(callback, options?)',
      description:
        "Calls `callback` when the scheme `<html>` resolves to changes: `WrTheme`'s inline `color-scheme`, a class or attribute on `<html>`, or the OS preference under `light dark`. Stops on destroy; returns a stop function. Does nothing on the server.",
      type: '(callback: (scheme: WrColorScheme) => void, options?: { injector?: Injector }) => () => void',
      default: '—',
    },
  ];
}
