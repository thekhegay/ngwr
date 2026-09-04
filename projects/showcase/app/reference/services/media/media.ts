import { Component, inject } from '@angular/core';

import { WrMedia } from 'ngwr/media';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-media-page',
  templateUrl: './media.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class MediaServicePageComponent {
  private readonly mediaService = inject(WrMedia);

  protected readonly currentBreakpoint = this.mediaService.current;
  protected readonly isMd = this.mediaService.matches('md');
  protected readonly isLg = this.mediaService.matches('lg');

  protected readonly snippets = {
    install: `import { WrMedia, provideWrMedia } from 'ngwr/media';

// Optional — override breakpoints (defaults match _breakpoints.scss).
bootstrapApplication(AppComponent, {
  providers: [provideWrMedia({ md: 720 })],
});`,
    usage: `private readonly media = inject(WrMedia);

protected readonly isMd = this.media.matches('md');
protected readonly isWide = this.media.matches('(min-width: 1200px)');
protected readonly current = this.media.current; // 'xs' | 'sm' | ...`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'matches(query)',
      description: 'Signal<boolean> for a named breakpoint or raw matchMedia query. Cached + SSR-safe.',
      type: '(q: WrBreakpoint | string) => Signal<boolean>',
      default: '—',
    },
    {
      name: 'current',
      description: 'Active breakpoint key — `xs` / `sm` / `md` / `lg` / `xl` / `xxl`.',
      type: 'Signal<WrBreakpoint>',
      default: '—',
    },
    {
      name: 'provideWrMedia(breakpoints?)',
      description: 'Override the breakpoint map. Partial — merged with defaults.',
      type: '(map?: Partial<WrBreakpointMap>) => EnvironmentProviders',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Server-side rendering',
      url: ['/guides', 'ssr'],
      description:
        '"SSR-safe" above means the calls do not throw, not that they answer. A server has no viewport, so `matches()` is `false` and `current()` is `xs` until hydration — the guide has the full table and the CSS reflow that avoids the swap.',
    },
    {
      kind: 'Service',
      title: 'WrPlatform',
      url: ['/reference/services', 'platform'],
      description:
        '`isBrowser` / `isServer` — the guard for code that must not run before there is a viewport to measure.',
    },
    {
      kind: 'Guide',
      title: 'Mobile & responsive',
      url: ['/guides', 'mobile'],
      description:
        'The `responsive` modifiers reflow through a container query, so they need no breakpoint signal at all.',
    },
  ];
}
