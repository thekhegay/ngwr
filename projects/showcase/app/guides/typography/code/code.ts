import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
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
    DocSeeAlsoComponent,
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
    tones: `<code wrTypography variant="code" tone="primary">routes.start.installation</code>
<code wrTypography variant="code" tone="success">200 OK</code>
<code wrTypography variant="code" tone="danger">500 Server Error</code>`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Directive',
      title: '[wrTypography]',
      url: ['/reference/directives', 'typography'],
      description: 'Every input, the full variant union, and the classes the directive emits.',
    },
  ];
}
