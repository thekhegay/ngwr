import { Component } from '@angular/core';

import { ArrowRight } from 'lucide';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-typo-links-page',
  templateUrl: './links.html',
  imports: [WrTypography, WrIcon, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
  providers: [provideWrIcons(lucideIcons({ 'arrow-forward': ArrowRight }))],
})
export default class TypographyLinksPage {
  protected readonly snippets = {
    basic: `<a wrTypography variant="link" href="…">ngwr on GitHub</a>`,
    inline: `<p wrTypography variant="body">
  … the <a wrTypography variant="link" href="…">getting started guide</a> …
</p>`,
    icon: `<a wrTypography variant="link" href="…">
  Read the changelog
  <wr-icon name="arrow-forward" size="14" />
</a>`,
  };
}
