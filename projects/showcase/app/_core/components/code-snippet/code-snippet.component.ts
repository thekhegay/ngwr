/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  resource,
  AfterViewInit,
  viewChild,
  ElementRef,
  contentChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { getHighlighter, type ShikiLang } from '#core/shiki';

@Component({
  selector: 'ngwr-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrl: './code-snippet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-code-snippet' },
})
export class CodeSnippetComponent implements AfterViewInit {
  readonly elRef = viewChild<ElementRef<HTMLElement>>('content');

  ngAfterViewInit(): void {
    const text = this.elRef()?.nativeElement.innerHTML;
    console.log(text);
  }
  // readonly code = input.required<string>();
  // readonly language = input<ShikiLang>('html');
  //
  // private readonly sanitizer = inject(DomSanitizer);
  //
  // protected readonly highlighted = resource({
  //   params: () => ({ code: this.code(), lang: this.language() }),
  //   loader: async ({ params }) => {
  //     const highlighter = await getHighlighter();
  //     const html = highlighter.codeToHtml(params.code, {
  //       lang: params.lang,
  //       themes: {
  //         light: 'github-light',
  //         dark: 'github-dark',
  //       },
  //       defaultColor: false, // emit CSS vars; consumer picks mode via `.dark` class
  //     });
  //     return this.sanitizer.bypassSecurityTrustHtml(html);
  //   },
  // });
  //
  // protected readonly copied = computed(() => false); // placeholder; we'll wire up in template
  //
  // async copy(): Promise<void> {
  //   await navigator.clipboard.writeText(this.code());
  // }
}
