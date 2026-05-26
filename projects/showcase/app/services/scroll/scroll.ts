import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WrScroll } from 'ngwr/scroll';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-scroll-page',
  templateUrl: './scroll.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ScrollServicePageComponent {
  private readonly scroll = inject(WrScroll);

  protected scrollToTop(): void {
    this.scroll.toTop({ offset: 80 });
  }

  protected readonly snippets = {
    usage: `private readonly scroll = inject(WrScroll);

this.scroll.to('#section-three', { offset: 80 });
this.scroll.toTop({ smooth: false });
this.scroll.intoView(myEl, { offset: 64 });`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'to(target, options?)',
      description: 'Scroll to an element, id (`#foo`), selector, or `{ top, left }` coords.',
      type: '(t, opts?) => void',
      default: '—',
    },
    {
      name: 'intoView(el, options?)',
      description: 'Convenience for an Element — same options as `to`.',
      type: '(el, opts?) => void',
      default: '—',
    },
    {
      name: 'toTop(options?)',
      description: 'Scroll the page (or container) to the top.',
      type: '(opts?) => void',
      default: '—',
    },
    {
      name: 'options.offset',
      description: 'Pixel offset subtracted from the target (sticky-header compensation).',
      type: 'number',
      default: '0',
    },
    {
      name: 'options.smooth',
      description: 'Smooth or instant. Auto-falls back to instant for `prefers-reduced-motion: reduce`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'options.container',
      description: 'Override the scroll container.',
      type: 'Window | Element',
      default: 'window',
    },
  ];
}
