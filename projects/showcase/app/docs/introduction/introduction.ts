import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BookOpen, Heart, Sparkles } from 'lucide';
import { WrButton } from 'ngwr/button';
import { WrCard } from 'ngwr/card';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrStatistic, WrStatisticGroup } from 'ngwr/statistic';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent } from '#core/components';
import { QUALITY } from '#core/generated/quality';
import { BRAND_ICONS } from '#core/icons';
import { ROUTES, wrPath } from '#routes';

@Component({
  selector: 'ngwr-docs-introduction-page',
  templateUrl: './introduction.html',
  styleUrl: './introduction.scss',
  imports: [
    RouterLink,
    WrButton,
    WrCard,
    WrIcon,
    WrStatistic,
    WrStatisticGroup,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
  ],
  providers: [
    provideWrIcons([...BRAND_ICONS, ...lucideIcons({ sparkles: Sparkles, 'book-open': BookOpen, heart: Heart })]),
  ],
})
export default class IntroductionPage {
  protected readonly quality = QUALITY;

  protected readonly skills = wrPath(ROUTES.docs, ROUTES.docs.skills);
  protected readonly mcp = wrPath(ROUTES.docs, ROUTES.docs.mcp);

  /** A parameterised spec makes the count a floor, and the label says so. */
  protected readonly testCasesLabel = QUALITY.testCasesAreExact ? 'Test cases' : 'Test cases (at least)';

  /** Components plus directives — the classes a consumer puts in `imports: []`. */
  protected readonly publicClasses = QUALITY.components + QUALITY.directives;
}
