import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrTypographyComponent } from 'ngwr/typography';

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
  templateUrl: './typography.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTypographyComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TypographyPageComponent {
  protected readonly snippets = {
    install: `import { WrTypographyComponent } from 'ngwr/typography';

@Component({ imports: [WrTypographyComponent] })
export class MyComponent {}`,
    variants: `<wr-typography variant="display">Display</wr-typography>
<wr-typography variant="h1">Heading 1</wr-typography>
<wr-typography variant="h2">Heading 2</wr-typography>
<wr-typography variant="h3">Heading 3</wr-typography>
<wr-typography variant="lead">Lead paragraph — a calmer subhead.</wr-typography>
<wr-typography>Body copy in the default variant.</wr-typography>
<wr-typography variant="small">Small print.</wr-typography>
<wr-typography variant="caption">Captions and helper text.</wr-typography>
<wr-typography variant="overline">Section label</wr-typography>
<wr-typography variant="code">code()</wr-typography>`,
    tones: `<wr-typography tone="primary">Primary</wr-typography>
<wr-typography tone="success">Success</wr-typography>
<wr-typography tone="warning">Warning</wr-typography>
<wr-typography tone="danger">Danger</wr-typography>
<wr-typography tone="medium">Muted</wr-typography>`,
    modifiers: `<wr-typography align="center">Centered</wr-typography>
<wr-typography truncate style="max-width: 16rem">A long line that gets ellipsized when it overflows the container.</wr-typography>`,
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
