import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlertComponent } from 'ngwr/alert';
import { WrAvatarComponent } from 'ngwr/avatar';
import { WrButtonComponent } from 'ngwr/button';
import { provideWrIcons, type WrIcon, WrIconComponent, wrIconSet } from 'ngwr/icon';
import { WrInputDirective, WrInputGroupComponent, WrInputPrefixDirective, WrPasswordToggleComponent } from 'ngwr/input';
import { WrProgressComponent } from 'ngwr/progress';
import { WrQrComponent } from 'ngwr/qr';
import { WrSkeletonComponent } from 'ngwr/skeleton';
import { WrTagComponent } from 'ngwr/tag';

import { MetaService } from '#core/services';
import { routes } from '#routing';

/** Fisher–Yates shuffle. Returns a new array. */
function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    WrIconComponent,
    WrQrComponent,
    WrProgressComponent,
    WrAvatarComponent,
    WrAlertComponent,
    WrTagComponent,
    WrSkeletonComponent,
    WrButtonComponent,
    WrInputDirective,
    WrInputGroupComponent,
    WrInputPrefixDirective,
    WrPasswordToggleComponent,
  ],
  providers: [provideWrIcons(wrIconSet)],
})
export default class HomeComponent {
  protected readonly currentDate = new Date();
  protected readonly icons: readonly WrIcon[] = shuffle(wrIconSet).slice(0, 30);
  protected readonly routes = routes;

  constructor() {
    const meta = inject(MetaService);
    meta.setCanonicalURL();
    meta.setTitle(null);
    meta.setDescription(
      'NGWR — open source Angular 21 components. Standalone, signals-first, bring-your-own design system.'
    );
    meta.setKeywords(['home', 'landing']);
  }
}
