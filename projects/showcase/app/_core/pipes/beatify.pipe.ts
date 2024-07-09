import { Pipe, PipeTransform } from '@angular/core';

import { js_beautify, html_beautify, css_beautify } from 'js-beautify';

@Pipe({
  standalone: true,
  name: 'beatify',
})
export class BeatifyPipe implements PipeTransform {
  transform(value: string): string {
    value = value.trimStart();

    if (
      value.startsWith('.') ||
      value.startsWith('@import') ||
      value.startsWith('@use') ||
      value.startsWith('@forward') ||
      value.startsWith(':') ||
      value.startsWith('--')
    ) {
      return css_beautify(value, { indent_size: 2 });
    }
    if (value.startsWith('<')) {
      return html_beautify(value, { indent_size: 2 });
    }
    return js_beautify(value, { indent_size: 2, brace_style: 'preserve-inline' });
  }
}
