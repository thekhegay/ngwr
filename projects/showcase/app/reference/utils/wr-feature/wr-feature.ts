import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-feature-page',
  templateUrl: './wr-feature.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrFeaturePage {
  protected readonly snippets = {
    feature: `import { InjectionToken } from '@angular/core';
import { type WrFeature, wrFeature } from 'ngwr/utils';

export interface MapsOptions {
  readonly tiles?: string;
}

export const MAPS_OPTIONS = new InjectionToken<MapsOptions>('MAPS_OPTIONS', {
  providedIn: 'root',
  factory: () => ({}),
});

export function withMaps(options: MapsOptions = {}): WrFeature<'maps'> {
  return wrFeature('maps', [{ provide: MAPS_OPTIONS, useValue: options }]);
}`,
    app: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';

providers: [provideWr(withDensity({ defaultDensity: 'sm' }), withMaps({ tiles: '/tiles' }))],`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrFeature(kind, providers)',
      description: 'Builds the feature `provideWr()` takes.',
      type: '<K extends string>(kind: K, providers: readonly (Provider | EnvironmentProviders)[]) => WrFeature<K>',
      default: '-',
    },
    {
      name: 'WrFeature<K>',
      description: 'One piece of app-wide configuration. The return type of a `withX()` function.',
      type: 'interface',
      default: '-',
    },
  ];
}
