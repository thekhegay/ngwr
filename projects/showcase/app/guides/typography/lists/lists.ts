import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-typo-lists-page',
  templateUrl: './lists.html',
  imports: [WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class TypographyListsPage {
  protected readonly snippets = {
    ul: `<ul wrTypography variant="list">
  <li>At least 10 characters</li>
  <li>At least one lowercase character</li>
</ul>`,
    ol: `<ol wrTypography variant="list">
  <li>Bonnie with 240 points</li>
  <li>Jese with 220 points</li>
</ol>`,
    nested: `<ul wrTypography variant="list">
  <li>
    List item one
    <ol>
      <li>Nested ordered item</li>
    </ol>
  </li>
</ul>`,
    dl: `<dl wrTypography variant="list">
  <dt>Email address</dt>
  <dd>yourname&#64;example.com</dd>
</dl>`,
  };
}
