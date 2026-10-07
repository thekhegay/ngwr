import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrDescriptionItem, WrDescriptions } from 'ngwr/descriptions';
import { WrStatistic, WrStatisticGroup } from 'ngwr/statistic';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import { QUALITY } from '#core/generated/quality';
import { ROUTES, wrPath } from '#routes';

@Component({
  selector: 'ngwr-docs-introduction-page',
  templateUrl: './introduction.html',
  imports: [
    RouterLink,
    WrAlert,
    WrDescriptionItem,
    WrDescriptions,
    WrStatistic,
    WrStatisticGroup,
    WrTypography,
    DocCodeComponent,
    DocPageComponent,
    DocSectionComponent,
  ],
})
export default class IntroductionPage {
  protected readonly quality = QUALITY;

  protected readonly skills = wrPath(ROUTES.docs, ROUTES.docs.skills);
  protected readonly mcp = wrPath(ROUTES.docs, ROUTES.docs.mcp);

  protected readonly snippets = {
    cli: `ng add ngwr`,
  };

  /** A parameterised spec makes the count a floor, and the label says so. */
  protected readonly testCasesLabel = QUALITY.testCasesAreExact ? 'Test cases' : 'Test cases (at least)';

  /** Components plus directives — the classes a consumer puts in `imports: []`. */
  protected readonly publicClasses = QUALITY.components + QUALITY.directives;
}
