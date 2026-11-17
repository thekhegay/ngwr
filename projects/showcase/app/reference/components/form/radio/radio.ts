import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrRadio, WrRadioGroup } from 'ngwr/radio';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

interface Tier {
  id: string;
  name: string;
}

@Component({
  selector: 'ngwr-radio-page',
  templateUrl: './radio.html',
  imports: [
    FormsModule,
    WrRadio,
    WrRadioGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocApiComponent,
  ],
})
export default class RadioComponent {
  protected readonly size = signal('md');
  protected readonly plan = signal('starter');

  protected readonly tiers: readonly Tier[] = [
    { id: 'free', name: 'Free' },
    { id: 'team', name: 'Team' },
    { id: 'business', name: 'Business' },
  ];
  protected readonly tier = signal<string | null>('team');
  protected readonly tierName = (tier: Tier): string => tier.name;
  protected readonly tierId = (tier: Tier): string => tier.id;

  protected readonly snippets = {
    basic: `<wr-radio-group [(value)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
  <wr-radio value="lg">Large</wr-radio>
</wr-radio-group>`,
    plans: `<wr-radio-group [(value)]="plan">
  <wr-radio value="starter">Starter — $0/mo</wr-radio>
  <wr-radio value="pro">Pro — $9/mo</wr-radio>
  <wr-radio value="enterprise">Enterprise — custom</wr-radio>
</wr-radio-group>`,
    options: `interface Tier {
  id: string;
  name: string;
}

protected readonly tiers: readonly Tier[] = [
  { id: 'free', name: 'Free' },
  { id: 'team', name: 'Team' },
  { id: 'business', name: 'Business' },
];
protected readonly tier = signal<string | null>('team');
protected readonly tierName = (tier: Tier): string => tier.name;
protected readonly tierId = (tier: Tier): string => tier.id;

<wr-radio-group [options]="tiers" [displayWith]="tierName" [valueWith]="tierId" [(value)]="tier" />`,
    disabled: `<wr-radio-group [disabled]="true" [(value)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
</wr-radio-group>`,
    disabledOption: `<wr-radio-group [(value)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
  <wr-radio value="lg" disabled>Large</wr-radio>
</wr-radio-group>`,
  };

  protected readonly api = API.WrRadio;

  protected readonly groupApi = API.WrRadioGroup;
}
