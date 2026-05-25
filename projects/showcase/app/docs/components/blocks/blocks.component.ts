import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  WrBlockCtaComponent,
  WrBlockFeaturesComponent,
  WrBlockHeroComponent,
  WrBlockNotFoundComponent,
  WrBlockPricingComponent,
  type WrBlockFeature,
  type WrBlockPricingTier,
} from 'ngwr/blocks';
import { flash, home, provideWrIcons, shield } from 'ngwr/icon';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-blocks-page',
  templateUrl: './blocks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrBlockHeroComponent,
    WrBlockFeaturesComponent,
    WrBlockPricingComponent,
    WrBlockCtaComponent,
    WrBlockNotFoundComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
  providers: [provideWrIcons([flash, home, shield])],
})
export default class BlocksPageComponent {
  protected readonly features: readonly WrBlockFeature[] = [
    { title: 'Signals-first', description: 'Built on Angular signals from the ground up.', icon: 'flash' },
    { title: 'Standalone', description: 'No NgModule clutter — every component stands on its own.', icon: 'home' },
    { title: 'Themable', description: 'Override CSS custom properties to retint everything.', icon: 'shield' },
  ];

  protected readonly tiers: readonly WrBlockPricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      priceSuffix: '/mo',
      description: 'For hobbyists.',
      features: ['Unlimited projects', 'Community support', 'Open source'],
      ctaLabel: 'Start free',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$12',
      priceSuffix: '/mo',
      description: 'For teams.',
      features: ['Everything in Free', 'Email support', 'Priority bug fixes', 'Private repos'],
      highlighted: true,
      ctaLabel: 'Upgrade',
    },
    {
      id: 'team',
      name: 'Team',
      price: '$48',
      priceSuffix: '/mo',
      description: 'For organizations.',
      features: ['Everything in Pro', 'SLA', 'Custom invoices', 'Dedicated channel'],
      ctaLabel: 'Contact us',
    },
  ];

  protected readonly snippets = {
    hero: `<wr-block-hero title="Build faster" subtitle="Angular UI components.">
  <span wrHeroBadge>v2.0 released</span>
  <div wrHeroActions>
    <button>Get started</button>
    <button>Read docs</button>
  </div>
  <img wrHeroMedia src="hero.png" alt="" />
</wr-block-hero>`,

    features: `<wr-block-features title="Why pick ngwr" [features]="features" />`,
    pricing: `<wr-block-pricing title="Simple pricing" [tiers]="tiers" (pick)="onChoosePlan($event)" />`,
    cta: `<wr-block-cta title="Ready to ship?" subtitle="Start building today.">
  <button wrCtaActions>Get started</button>
</wr-block-cta>`,
    notFound: `<wr-block-not-found>
  <a wrNotFoundActions routerLink="/">Back home</a>
</wr-block-not-found>`,
  };
}
