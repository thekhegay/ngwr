import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NGWR_VERSION_TOKEN } from 'ngwr/version';

interface FooterLink {
  readonly label: string;
  readonly url: string | readonly string[];
  readonly external?: boolean;
}

interface FooterColumn {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

@Component({
  selector: 'ngwr-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  imports: [RouterLink],
  host: {
    '[class]': 'hostClass()',
  },
})
export class Footer {
  /**
   * Drop the brand + link-columns block, render only the copyright/version
   * row. Set to `true` on docs/sidebar pages so the chrome stays light.
   * The homepage leaves it `false` for the full sitemap-style footer.
   */
  readonly compact = input(false, { transform: coerceBooleanProperty });

  /**
   * Constrain the footer's inner rows to the same max-width as the host
   * page's `.container`. Use on the homepage so the brand + columns line
   * up with the hero / bento above. Docs pages leave it off — their
   * sidebar provides the rhythm.
   */
  readonly contained = input(false, { transform: coerceBooleanProperty });

  protected readonly hostClass = (): string => {
    const parts = ['ngwr-footer'];
    if (this.compact()) parts.push('ngwr-footer--compact');
    if (this.contained()) parts.push('ngwr-footer--contained');
    return parts.join(' ');
  };

  protected readonly version = inject(NGWR_VERSION_TOKEN);
  protected readonly copyright = `2022 – ${new Date().getFullYear()} © Roman Khegay`;
  protected readonly npmLink = 'https://www.npmjs.com/package/ngwr';

  protected readonly columns: readonly FooterColumn[] = [
    {
      title: 'Docs',
      links: [
        { label: 'Installation', url: ['/start', 'installation'] },
        { label: 'Theming', url: ['/guides', 'theming'] },
        { label: 'Typography', url: ['/guides/typography'] },
        { label: 'Translate (i18n)', url: ['/guides/translations'] },
        { label: 'Schematics', url: ['/start', 'schematics'] },
        { label: 'Migration', url: ['/start', 'migration'] },
      ],
    },
    {
      title: 'Catalog',
      links: [
        { label: 'Components', url: ['/reference/components'] },
        { label: 'Directives', url: ['/reference/directives'] },
        { label: 'Animations', url: ['/animations'] },
        { label: 'Icons', url: ['/icons'] },
        { label: 'Pipes', url: ['/reference/pipes'] },
        { label: 'Services', url: ['/reference/services'] },
        { label: 'Utils', url: ['/reference/utils'] },
        { label: 'Interfaces', url: ['/reference/interfaces'] },
        { label: 'Validators', url: ['/reference/validators'] },
      ],
    },
    {
      title: 'Project',
      links: [
        { label: 'GitHub', url: 'https://github.com/thekhegay/ngwr', external: true },
        { label: 'npm', url: 'https://www.npmjs.com/package/ngwr', external: true },
        { label: 'llms.txt', url: '/llms.txt', external: true },
        { label: 'License (MIT)', url: 'https://github.com/thekhegay/ngwr/blob/main/LICENSE', external: true },
      ],
    },
  ];
}
