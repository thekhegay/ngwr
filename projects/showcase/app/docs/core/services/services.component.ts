import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WrMediaService } from 'ngwr/media';
import { WrMetaService } from 'ngwr/meta';
import { WrPlatformService } from 'ngwr/platform';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-services-page',
  templateUrl: './services.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ServicesPageComponent {
  private readonly metaService = inject(WrMetaService);
  private readonly mediaService = inject(WrMediaService);
  private readonly platformService = inject(WrPlatformService);

  // Live demo signals — read from the service singletons.
  protected readonly currentBreakpoint = this.mediaService.current;
  protected readonly isMd = this.mediaService.matches('md');
  protected readonly isLg = this.mediaService.matches('lg');
  protected readonly prefersDark = this.platformService.prefersDark;
  protected readonly prefersReducedMotion = this.platformService.prefersReducedMotion;
  protected readonly isBrowser = this.platformService.isBrowser;

  protected pushMeta(): void {
    const handle = this.metaService.push({
      title: 'Demo title pushed!',
      description: 'Open devtools → Elements → <head> to see the changes.',
    });
    setTimeout(() => handle.pop(), 4000);
  }

  protected readonly snippets = {
    metaInstall: `import { provideWrMeta, WrMetaService } from 'ngwr/meta';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrMeta({
      titleTemplate: '%s · NGWR',
      og: { siteName: 'NGWR', type: 'website' },
      twitter: { card: 'summary_large_image', creator: '@thekhegay' },
    }),
  ],
});`,

    metaPush: `private readonly meta = inject(WrMetaService);

ngOnInit() {
  const handle = this.meta.push({
    title: 'Pricing',
    description: 'Plans for every team.',
    og: { image: '/og/pricing.png' },
  });
  this.destroyRef.onDestroy(() => handle.pop());
}`,

    metaDirective: `<!-- Auto-pops on destroy. Perfect for route components. -->
<div [wrMeta]="{ title: 'Pricing', description: 'Plans for every team.' }">
  …
</div>`,

    mediaInstall: `import { WrMediaService, provideWrMedia } from 'ngwr/media';

// Optional — override breakpoints (defaults match _breakpoints.scss).
bootstrapApplication(AppComponent, {
  providers: [provideWrMedia({ md: 720 })],
});`,

    mediaUsage: `private readonly media = inject(WrMediaService);

protected readonly isMd = this.media.matches('md');
protected readonly isWide = this.media.matches('(min-width: 1200px)');
protected readonly current = this.media.current; // 'xs' | 'sm' | ...`,

    platformUsage: `private readonly platform = inject(WrPlatformService);

if (this.platform.isBrowser) {
  localStorage.setItem('theme', 'dark');
}

protected readonly dark = this.platform.prefersDark;       // Signal<boolean>
protected readonly reduce = this.platform.prefersReducedMotion;`,
  };

  protected readonly metaApi: readonly DocApiRow[] = [
    {
      name: 'set(config)',
      description: 'Replace the current top of the stack (or set it if only defaults are present).',
      type: '(config: WrMetaConfig) => void',
      default: '—',
    },
    {
      name: 'push(config)',
      description: 'Push a new layer. Returns `{ pop }` — call `.pop()` to remove the layer.',
      type: '(config: WrMetaConfig) => WrMetaHandle',
      default: '—',
    },
    {
      name: 'pop()',
      description: 'Pop the most recently pushed layer.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'reset()',
      description: 'Clear all overrides, restore defaults registered via provideWrMeta.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'current()',
      description: 'Snapshot of the resolved metadata currently applied to <head>.',
      type: '() => Readonly<WrMetaConfig>',
      default: '—',
    },
    {
      name: '[wrMeta]',
      description: 'Directive: pushes on init, re-pushes on input change, pops on destroy.',
      type: 'WrMetaConfig',
      default: '—',
    },
  ];

  protected readonly mediaApi: readonly DocApiRow[] = [
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

  protected readonly platformApi: readonly DocApiRow[] = [
    { name: 'isBrowser / isServer', description: 'Synchronous platform check.', type: 'boolean', default: '—' },
    {
      name: 'userAgent',
      description: '`navigator.userAgent` or `null` on the server.',
      type: 'string | null',
      default: '—',
    },
    {
      name: 'prefersDark',
      description: 'Signal mirroring `(prefers-color-scheme: dark)`.',
      type: 'Signal<boolean>',
      default: '—',
    },
    {
      name: 'prefersReducedMotion',
      description: 'Signal mirroring `(prefers-reduced-motion: reduce)`.',
      type: 'Signal<boolean>',
      default: '—',
    },
  ];
}
