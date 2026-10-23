import { Component, inject } from '@angular/core';

import { WrSegmented } from 'ngwr/segmented';
import { WrTheme, wrThemePrePaintScript } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-theme-page',
  templateUrl: './theme.html',
  imports: [WrSegmented, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ThemeServicePageComponent {
  protected readonly themeService = inject(WrTheme);

  protected readonly modeOptions = [
    { label: 'light', value: 'light' },
    { label: 'dark', value: 'dark' },
    { label: 'auto', value: 'auto' },
  ] as const;

  protected setTheme(mode: 'light' | 'dark' | 'auto' | null): void {
    // `wr-segmented` can publish `null` for "nothing selected", which is not a theme.
    if (mode) this.themeService.set(mode);
  }

  /**
   * The pre-paint script, GENERATED rather than typed out.
   *
   * A recipe printed as a string literal is correct until the storage envelope,
   * the key or the default mode moves — and then this page is telling readers to
   * paste something that no longer matches the library they installed. Calling
   * the function the library ships means the block below cannot say anything the
   * library does not do.
   */
  protected readonly prePaint = `<script>${wrThemePrePaintScript()}</script>`;

  protected readonly snippets = {
    usage: `private readonly theme = inject(WrTheme);

this.theme.set('dark');
this.theme.toggle();

protected readonly resolved = this.theme.resolved; // Signal<'light' | 'dark'>
protected readonly mode = this.theme.mode;         // Signal<'light' | 'dark' | 'auto'>`,
    config: `import { provideWr } from 'ngwr';
import { withTheme } from 'ngwr/theme';

bootstrapApplication(AppComponent, {
  providers: [
    // Defaults: 'auto' and 'wr-theme'; storageKey: null stops persisting.
    provideWr(withTheme({ defaultMode: 'dark', storageKey: 'app-theme' })),
  ],
});`,
    prePaintCustom: `import { wrThemePrePaintScript } from 'ngwr/theme';

// Pass the values you gave withTheme() and withStorage():
wrThemePrePaintScript({ storageKey: 'app-theme', defaultMode: 'dark', storagePrefix: 'myapp:' });

// It returns the source without <script>, so a strict CSP can hash it:
const hash = createHash('sha256').update(wrThemePrePaintScript()).digest('base64');`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'mode',
      description: 'The chosen mode: `light`, `dark` or `auto`.',
      type: 'Signal<WrThemeMode>',
      default: '—',
    },
    {
      name: 'resolved',
      description: 'The scheme in effect; `auto` follows the OS.',
      type: "Signal<'light' | 'dark'>",
      default: '—',
    },
    { name: 'set(mode)', description: 'Switch to a specific mode.', type: '(m: WrThemeMode) => void', default: '—' },
    { name: 'toggle()', description: 'Flip between light and dark (skips auto).', type: '() => void', default: '—' },
    {
      name: 'WR_THEME_CONFIG',
      description: 'Holds `defaultMode` and `storageKey`. Set it with `withTheme()`.',
      type: 'InjectionToken<WrThemeConfig>',
      default: '—',
    },
    {
      name: 'withTheme(config?)',
      description: 'The `provideWr()` feature: sets `WR_THEME_CONFIG` and creates `WrTheme` at boot.',
      type: "(config?: Partial<WrThemeConfig>) => WrFeature<'theme'>",
      default: '—',
    },
    {
      name: 'wrThemePrePaintScript(options?)',
      description:
        'Source of the script that applies a stored choice before the first paint. Takes the `withTheme()` and `withStorage()` values.',
      type: '(options?: WrThemePrePaintOptions) => string',
      default: '—',
    },
  ];
}
