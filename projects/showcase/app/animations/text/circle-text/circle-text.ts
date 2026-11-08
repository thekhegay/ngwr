import { Component } from '@angular/core';

import { WrCircleText } from 'ngwr/animations/circle-text';
import { WrIcon, provideWrIcons } from 'ngwr/icon';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';
import { BRAND_ICONS } from '#core/icons';

@Component({
  selector: 'ngwr-circle-text-page',
  templateUrl: './circle-text.html',
  imports: [
    WrCircleText,
    WrIcon,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons([...BRAND_ICONS])],
})
export default class CircleTextPageComponent {
  protected readonly snippets = {
    basic: `<wr-circle-text text="Open source · MIT · Signals-first · ">
  <wr-icon name="ngwr" />
</wr-circle-text>`,
    size: `<wr-circle-text text="Scroll down · " size="160" speed="-20" hoverSpeed="-80" />`,
    label: `<a href="/docs"><wr-circle-text text="Read the docs · " label="Read the docs" /></a>`,
    styled: `.seal {
  --wr-circle-text-size: 8rem;
  --wr-circle-text-color: var(--wr-color-primary-ink);
  --wr-circle-text-font-size: 10px;
}`,
  };

  protected readonly api = API.WrCircleText;
}
