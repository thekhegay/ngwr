import type { ElementRef } from '@angular/core';
import { Component, inject, viewChild } from '@angular/core';

import { WrButton } from 'ngwr/button';
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
  imports: [WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ScrollServicePageComponent {
  private readonly scroll = inject(WrScroll);
  private readonly scrollBox = viewChild.required<ElementRef<HTMLElement>>('scrollBox');

  protected readonly sections = [
    {
      id: 'one',
      title: 'Section one',
      body: 'Jump between sections with the buttons above — the service scrolls this box, not the page.',
    },
    { id: 'two', title: 'Section two', body: 'Each jump uses scroll.to() with the box as the container.' },
    {
      id: 'three',
      title: 'Section three',
      body: 'The page-top button scrolls the window instead, with an 80px offset.',
    },
  ] as const;

  protected scrollToTop(): void {
    this.scroll.toTop({ offset: 80 });
  }

  protected scrollToSection(id: string): void {
    this.scroll.to(`#scroll-demo-${id}`, { container: this.scrollBox().nativeElement, smooth: true });
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
