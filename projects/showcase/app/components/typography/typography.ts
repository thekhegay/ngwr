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
  selector: 'ngwr-typography-page',
  templateUrl: './typography.html',
  imports: [WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class TypographyPageComponent {
  protected readonly snippets = {
    install: `import { WrTypography } from 'ngwr/typography';

@Component({ imports: [WrTypography] })
export class MyComponent {}`,
    variants: `<h1 wrTypography variant="display">Display</h1>
<h1 wrTypography variant="h1">Heading 1</h1>
<h2 wrTypography variant="h2">Heading 2</h2>
<h3 wrTypography variant="h3">Heading 3</h3>
<h4 wrTypography variant="h4">Heading 4</h4>
<h5 wrTypography variant="h5">Heading 5</h5>
<h6 wrTypography variant="h6">Heading 6</h6>
<p  wrTypography variant="lead">Lead paragraph — a calmer subhead.</p>
<p  wrTypography>Body copy in the default variant.</p>
<p  wrTypography variant="small">Small print.</p>
<p  wrTypography variant="caption">Captions and helper text.</p>
<p  wrTypography variant="overline">Section label</p>
<code wrTypography variant="code">code()</code>`,
    tones: `<p wrTypography tone="dark">Dark (default)</p>
<p wrTypography tone="medium">Muted</p>
<p wrTypography tone="primary">Primary</p>
<p wrTypography tone="success">Success</p>
<p wrTypography tone="warning">Warning</p>
<p wrTypography tone="danger">Danger</p>`,
    alignment: `<p wrTypography align="start">Start (default)</p>
<p wrTypography align="center">Centered</p>
<p wrTypography align="end">End</p>
<p wrTypography align="justify">Justified text fills the line width by adjusting word spacing — readable for long-form copy.</p>`,
    truncate: `<p wrTypography [truncate]="true" style="max-width: 18rem">
  A long line that gets ellipsized when it overflows the container.
</p>`,
    mono: `<p wrTypography [mono]="true">Monospaced body copy — useful for inline tokens.</p>
<code wrTypography variant="code">inject(WrTheme)</code>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'variant',
      type: `'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'lead' | 'body' | 'small' | 'caption' | 'overline' | 'code'`,
      default: `'body'`,
      description: 'Visual variant.',
    },
    {
      name: 'tone',
      type: `'dark' | 'medium' | 'primary' | 'success' | 'warning' | 'danger'`,
      default: `'dark'`,
      description: 'Color tone.',
    },
    {
      name: 'align',
      type: `'start' | 'center' | 'end' | 'justify' | null`,
      default: 'null',
      description: 'Horizontal alignment.',
    },
    {
      name: 'truncate',
      type: 'boolean',
      default: 'false',
      description: 'Single-line ellipsis when content overflows.',
    },
    {
      name: 'mono',
      type: 'boolean',
      default: 'false',
      description: 'Render with monospace font. Auto-true for `code`.',
    },
  ];
}
