import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlertModule } from 'ngwr/alert';
import { WrAvatarModule } from 'ngwr/avatar';
import { WrButtonModule } from 'ngwr/button';
import { provideWrIcons, WrIcon, WrIconModule, wrIconSet } from 'ngwr/icon';
import { WrInputModule } from 'ngwr/input';
import { WrProgressModule } from 'ngwr/progress';
import { WrQrModule } from 'ngwr/qr';
import { WrSkeletonModule } from 'ngwr/skeleton';
import { WrTagModule } from 'ngwr/tag';

import { SeoService } from '#core/services';
import { routes } from '#routing';

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    WrAvatarModule,
    WrAlertModule,
    WrButtonModule,
    WrIconModule,
    WrProgressModule,
    WrQrModule,
    WrSkeletonModule,
    WrTagModule,
    WrInputModule,
  ],
  providers: [provideWrIcons(wrIconSet)],
})
export class HomeComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  protected readonly currentDate = new Date();
  protected readonly icons = this.shuffleArray(wrIconSet);
  protected readonly routes = routes;

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('NGWR – Angular UI components library');
  }

  shuffleArray(array: WrIcon[]): WrIcon[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
