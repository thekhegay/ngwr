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
    '[class]': "compact() ? 'ngwr-footer ngwr-footer--compact' : 'ngwr-footer'",
  },
})
export class Footer {
  /**
   * Drop the brand + link-columns block, render only the copyright/version
   * row. Set to `true` on docs/sidebar pages so the chrome stays light.
   * The homepage leaves it `false` for the full sitemap-style footer.
   */
  readonly compact = input(false, { transform: coerceBooleanProperty });

  protected readonly version = inject(NGWR_VERSION_TOKEN);
  protected readonly copyright = `2022 – ${new Date().getFullYear()} © Roman Khegay`;
  protected readonly npmLink = 'https://www.npmjs.com/package/ngwr';

  protected readonly columns: readonly FooterColumn[] = [
    {
      title: 'Docs',
      links: [
        { label: 'Installation', url: ['/getting-started', 'installation'] },
        { label: 'Theming', url: ['/getting-started', 'theming'] },
        { label: 'Schematics', url: ['/getting-started', 'schematics'] },
        { label: 'Migration', url: ['/getting-started', 'changelog'] },
      ],
    },
    {
      title: 'Catalog',
      links: [
        { label: 'Components', url: ['/components', 'button'] },
        { label: 'Directives', url: ['/directives', 'border-glow'] },
        { label: 'Pipes', url: ['/pipes', 'wr-t'] },
        { label: 'Services', url: ['/services', 'storage'] },
        { label: 'Icons', url: ['/icons', 'lucide'] },
      ],
    },
    {
      title: 'Project',
      links: [
        { label: 'GitHub', url: 'https://github.com/thekhegay/ngwr', external: true },
        { label: 'npm', url: 'https://www.npmjs.com/package/ngwr', external: true },
        { label: 'License (MIT)', url: 'https://github.com/thekhegay/ngwr/blob/main/LICENSE', external: true },
      ],
    },
  ];
}
