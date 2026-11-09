import { Component } from '@angular/core';

import { WrOrbit } from 'ngwr/animations/orbit';
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
  selector: 'ngwr-orbit-page',
  templateUrl: './orbit.html',
  imports: [
    WrOrbit,
    WrIcon,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons([...BRAND_ICONS])],
})
export default class OrbitPageComponent {
  protected readonly snippets = {
    basic: `<wr-orbit text="Open source · MIT · Signals-first · ">
  <wr-icon name="ngwr" />
</wr-orbit>`,
    size: `<wr-orbit text="Scroll down · " size="160" speed="-20" hoverSpeed="-80" />`,
    label: `<a href="/docs"><wr-orbit text="Read the docs · " label="Read the docs" /></a>`,
    styled: `.seal {
  --wr-orbit-size: 8rem;
  --wr-orbit-color: var(--wr-color-primary-ink);
  --wr-orbit-font-size: 10px;
}`,
  };

  protected readonly api = API.WrOrbit;
}
