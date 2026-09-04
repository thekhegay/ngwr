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
    install: `import { provideWrTheme, WrTheme } from 'ngwr/theme';

bootstrapApplication(AppComponent, {
  providers: [provideWrTheme({ defaultMode: 'auto' })],
});`,
    usage: `private readonly theme = inject(WrTheme);

this.theme.set('dark');
this.theme.toggle();

protected readonly resolved = this.theme.resolved; // Signal<'light' | 'dark'>
protected readonly mode = this.theme.mode;         // Signal<'light' | 'dark' | 'auto'>`,
    prePaintCustom: `import { wrThemePrePaintScript } from 'ngwr/theme';

// Same script, for an app that renamed the attribute, the key or the prefix.
// Pass the same values you gave provideWrTheme() / provideWrStorage():
wrThemePrePaintScript({
  attribute: 'app-theme',    // provideWrTheme({ attribute })
  storageKey: 'theme-mode',  // provideWrTheme({ storageKey })
  defaultMode: 'dark',       // provideWrTheme({ defaultMode })
  storagePrefix: 'myapp:',   // provideWrStorage({ prefix })
});

// It returns the JS source with NO <script> wrapper, so an SSR template can
// inline it — and a CSP that forbids 'unsafe-inline' can hash it instead of
// reaching for a nonce:
const source = wrThemePrePaintScript();
const hash = createHash('sha256').update(source).digest('base64');
// Content-Security-Policy: script-src 'sha256-\${hash}'`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'mode',
      description: "User-selected mode — `'light' | 'dark' | 'auto'`.",
      type: 'Signal<WrThemeMode>',
      default: '—',
    },
    {
      name: 'resolved',
      description: 'Resolved theme actually applied to <html>.',
      type: "Signal<'light' | 'dark'>",
      default: '—',
    },
    { name: 'set(mode)', description: 'Switch to a specific mode.', type: '(m: WrThemeMode) => void', default: '—' },
    { name: 'toggle()', description: 'Flip light ↔ dark (skips auto).', type: '() => void', default: '—' },
    {
      name: 'provideWrTheme(config?)',
      description: 'Configure defaultMode, storageKey, attribute name.',
      type: '(config?) => EnvironmentProviders',
      default: '—',
    },
    {
      name: 'wrThemePrePaintScript(options?)',
      description:
        'Source of the blocking script that resolves the theme before first paint. Takes the same `attribute` / `storageKey` / `defaultMode` you passed `provideWrTheme()`, plus `storagePrefix` and `json` from `provideWrStorage()`.',
      type: '(options?: WrThemePrePaintOptions) => string',
      default: '—',
    },
  ];
}
