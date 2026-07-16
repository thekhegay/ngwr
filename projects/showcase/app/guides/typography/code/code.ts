import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-typography-code-page',
  templateUrl: './code.html',
  imports: [
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TypographyCodePage {
  protected readonly snippets = {
    inline: `<p wrTypography>
  Inject the theme service with <code wrTypography variant="code">inject(WrTheme)</code>.
</p>`,
    mono: `<p wrTypography [mono]="true">
  Forces monospace on any variant — useful for ids, paths, version tags.
</p>`,
    tones: `<code wrTypography variant="code" tone="primary">routes.gettingStarted</code>
<code wrTypography variant="code" tone="success">200 OK</code>
<code wrTypography variant="code" tone="danger">500 Server Error</code>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'variant="code"',
      type: 'string literal',
      default: '—',
      description: 'Inline-code variant. Implies `mono` automatically.',
    },
    {
      name: 'mono',
      type: 'boolean',
      default: 'false',
      description: 'Force monospace on any variant. The `code` variant sets this implicitly.',
    },
    {
      name: 'tone',
      type: `'dark' | 'medium' | 'primary' | 'success' | 'warning' | 'danger'`,
      default: `'dark'`,
      description: 'Color tone — handy for status codes inside docs.',
    },
  ];
}
