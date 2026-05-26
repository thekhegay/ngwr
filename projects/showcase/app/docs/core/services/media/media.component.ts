import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WrMediaService } from 'ngwr/media';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-media-page',
  templateUrl: './media.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class MediaServicePageComponent {
  private readonly mediaService = inject(WrMediaService);

  protected readonly currentBreakpoint = this.mediaService.current;
  protected readonly isMd = this.mediaService.matches('md');
  protected readonly isLg = this.mediaService.matches('lg');

  protected readonly snippets = {
    install: `import { WrMediaService, provideWrMedia } from 'ngwr/media';

// Optional — override breakpoints (defaults match _breakpoints.scss).
bootstrapApplication(AppComponent, {
  providers: [provideWrMedia({ md: 720 })],
});`,
    usage: `private readonly media = inject(WrMediaService);

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
}
