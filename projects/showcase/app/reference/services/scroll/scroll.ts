import type { ElementRef } from '@angular/core';
import { Component, inject, signal, viewChild } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrScroll, WrScrollFollow } from 'ngwr/scroll';

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
  styleUrl: './scroll.scss',
  imports: [
    WrButton,
    WrScrollFollow,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
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
      body: 'The page-top button scrolls the window instead.',
    },
  ] as const;

  protected scrollToTop(): void {
    this.scroll.toTop();
  }

  protected scrollToSection(id: string): void {
    this.scroll.to(`#scroll-demo-${id}`, {
      container: this.scrollBox().nativeElement,
      offset: 16,
      smooth: true,
    });
  }

  protected readonly messages = signal(Array.from({ length: 12 }, (_, index) => 21 + index));

  protected loadOlder(): void {
    this.messages.update(list => [...Array.from({ length: 5 }, (_, index) => list[0] - 5 + index), ...list]);
  }

  protected addMessage(): void {
    this.messages.update(list => [...list, list[list.length - 1] + 1]);
  }

  protected readonly snippets = {
    follow: `<div class="log" wrScrollFollow #log="wrScrollFollow">
  @for (message of messages(); track message.id) {
    <p>{{ message.text }}</p>
  }
</div>

@if (!log.following()) {
  <button wr-btn type="button" (click)="log.toEnd()">Jump to latest</button>
}`,
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
      description: 'Scroll to an element. Same options as `to()`.',
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
      description: 'Pixels subtracted from the target, for a sticky header. No effect on `toTop()`.',
      type: 'number',
      default: '0',
    },
    {
      name: 'options.smooth',
      description: 'Smooth or instant. Always instant under `prefers-reduced-motion: reduce`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'options.container',
      description: 'The element to scroll instead of the window.',
      type: 'Window | Element',
      default: 'window',
    },
  ];
  protected readonly followApi: readonly DocApiRow[] = [
    {
      name: '[wrScrollFollow]',
      description: '`false` switches it off and hands scroll anchoring back to the browser.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: '[wrScrollFollowThreshold]',
      description: 'How close to the end, in pixels, the reader has to scroll back for the following to resume.',
      type: 'number',
      default: '80',
    },
    {
      name: 'following()',
      description: 'A signal: whether the box is held at its end. `false` once the reader scrolls up.',
      type: '() => boolean',
      default: '—',
    },
    {
      name: 'toEnd(options?)',
      description: 'Scroll to the end and follow again. `{ smooth: false }` makes it instant.',
      type: '(opts?) => void',
      default: '—',
    },
  ];
}
