import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Heart } from 'lucide';
import { WrButton } from 'ngwr/button';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent } from '#core/components';
import { BRAND_ICONS } from '#core/icons';
import { ROUTES, wrPath } from '#routes';

@Component({
  selector: 'ngwr-docs-introduction-page',
  templateUrl: './introduction.html',
  styleUrl: './introduction.scss',
  imports: [RouterLink, WrButton, WrIcon, WrTypography, DocPageComponent, DocSectionComponent],
  providers: [provideWrIcons([...BRAND_ICONS, ...lucideIcons({ heart: Heart })])],
})
export default class IntroductionPage {
  protected readonly paths = {
    installation: wrPath(ROUTES.docs, ROUTES.docs.installation),
    configuration: wrPath(ROUTES.docs, ROUTES.docs.configuration),
    skills: wrPath(ROUTES.docs, ROUTES.docs.skills),
    mcp: wrPath(ROUTES.docs, ROUTES.docs.mcp),
    guides: wrPath(ROUTES.guides),
    forms: wrPath(ROUTES.guides, ROUTES.guides.forms),
    theming: wrPath(ROUTES.guides, ROUTES.guides.theming),
    ssr: wrPath(ROUTES.guides, ROUTES.guides.ssr),
    testing: wrPath(ROUTES.guides, ROUTES.guides.testing),
    components: wrPath(ROUTES.reference, ROUTES.reference.components),
  };
}
