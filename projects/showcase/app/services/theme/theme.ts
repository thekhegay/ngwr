import { Component, inject } from '@angular/core';

import { WrTheme } from 'ngwr/theme';

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
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ThemeServicePageComponent {
  protected readonly themeService = inject(WrTheme);

  protected setTheme(mode: 'light' | 'dark' | 'auto'): void {
    this.themeService.set(mode);
  }

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
  ];
}
