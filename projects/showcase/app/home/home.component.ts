import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlertComponent } from 'ngwr/alert';
import { WrAvatarComponent } from 'ngwr/avatar';
import { WrButtonComponent } from 'ngwr/button';
import { provideWrIcons, WrIcon, WrIconComponent, wrIconSet } from 'ngwr/icon';
import { WrInputComponent } from 'ngwr/input';
import { WrProgressComponent } from 'ngwr/progress';
import { WrQrComponent } from 'ngwr/qr';
import { WrSkeletonComponent } from 'ngwr/skeleton';
import { WrTagComponent } from 'ngwr/tag';

import { SeoService } from '#core/services';
import { routes } from '#routing';

@Component({
  standalone: true,
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
    WrInputComponent,
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
