import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';

import { WrHotkeyService } from 'ngwr/hotkey';
import { WrMediaService } from 'ngwr/media';
import { WrMetaService } from 'ngwr/meta';
import { WrPlatformService } from 'ngwr/platform';
import { WrScrollService } from 'ngwr/scroll';
import { WrThemeService } from 'ngwr/theme';

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
  protected readonly themeService = inject(WrThemeService);
  private readonly hotkeys = inject(WrHotkeyService);
  protected readonly lastHotkey = signal<string>('');
  private readonly scroll = inject(WrScrollService);

  protected scrollToTop(): void {
    this.scroll.toTop({ offset: 80 });
  }

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

  protected setTheme(mode: 'light' | 'dark' | 'auto'): void {
    this.themeService.set(mode);
  }

  constructor() {
    const handle = this.hotkeys.bind('mod+/', () => {
      this.lastHotkey.set(`mod+/ fired at ${new Date().toLocaleTimeString()}`);
    });
    inject(DestroyRef).onDestroy(() => handle.unbind());
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

    themeInstall: `import { provideWrTheme, WrThemeService } from 'ngwr/theme';

bootstrapApplication(AppComponent, {
  providers: [provideWrTheme({ defaultMode: 'auto' })],
});`,

    themeUsage: `private readonly theme = inject(WrThemeService);

this.theme.set('dark');
this.theme.toggle();

protected readonly resolved = this.theme.resolved; // Signal<'light' | 'dark'>
protected readonly mode = this.theme.mode;         // Signal<'light' | 'dark' | 'auto'>`,

    hotkeyUsage: `private readonly hotkeys = inject(WrHotkeyService);

ngOnInit() {
  const handle = this.hotkeys.bind('mod+k', () => this.openPalette(), {
    preventDefault: true,
    allowInInput: false,
  });
  this.destroyRef.onDestroy(() => handle.unbind());
}

// Or use the directive form:
// <button [wrHotkey]="'mod+k'" (wrHotkeyMatch)="openPalette()">…</button>`,

    scrollUsage: `private readonly scroll = inject(WrScrollService);

this.scroll.to('#section-three', { offset: 80 });
this.scroll.toTop({ smooth: false });
this.scroll.intoView(myEl, { offset: 64 });`,
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

  protected readonly scrollApi: readonly DocApiRow[] = [
    {
      name: 'to(target, options?)',
      description: 'Scroll to an element, id (`#foo`), CSS selector, or `{ top, left }` coords.',
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
      description: 'Smooth or instant. Auto-falls-back to instant when `prefers-reduced-motion: reduce`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'options.container',
      description: 'Override the scroll container. Defaults to `window`.',
      type: 'Window | Element',
      default: 'window',
    },
  ];

  protected readonly hotkeyApi: readonly DocApiRow[] = [
    {
      name: 'bind(spec, handler, options?)',
      description: 'Register a binding. Returns `{ unbind }`.',
      type: '(spec, handler, options?) => WrHotkeyHandle',
      default: '—',
    },
    {
      name: '[wrHotkey]',
      description: 'Directive form: binds on init, re-binds on input change, unbinds on destroy.',
      type: 'WrHotkeySpec',
      default: '—',
    },
    {
      name: 'spec format',
      description:
        "'+'-separated tokens: modifiers (ctrl/alt/shift/meta/cmd/mod) + key. `mod` = Cmd on macOS, Ctrl elsewhere.",
      type: 'string',
      default: '—',
    },
  ];

  protected readonly themeApi: readonly DocApiRow[] = [
    {
      name: 'mode',
      description: "User-selected mode — `'light' | 'dark' | 'auto'`.",
      type: 'Signal<WrThemeMode>',
      default: '—',
    },
    {
      name: 'resolved',
      description: "Resolved theme actually applied to <html> — `'light' | 'dark'`.",
      type: 'Signal<WrTheme>',
      default: '—',
    },
    { name: 'set(mode)', description: 'Switch to a specific mode.', type: '(m: WrThemeMode) => void', default: '—' },
    { name: 'toggle()', description: 'Flip light ↔ dark (skips auto).', type: '() => void', default: '—' },
    {
      name: 'provideWrTheme(config?)',
      description: 'Configure defaultMode, storageKey (null disables persistence), attribute name.',
      type: '(config?: Partial<WrThemeConfig>) => EnvironmentProviders',
      default: '—',
    },
  ];
}
