/**
 * Tilted, infinite-scrolling bento wall of live ngwr-component tiles.
 *
 * Sits in the hero's right column. Visually the grid is much taller than
 * the hero so the scroll loop never reveals an empty edge — it's clipped
 * by the wrapper's `overflow: hidden`. Each column scrolls at a slightly
 * different speed via pure CSS keyframes; tiles are duplicated inside
 * each column so the end of one set meets the start of the next without
 * a seam.
 *
 * `prefers-reduced-motion` pauses the animation but keeps the grid
 * visible (just a static snapshot of whatever happened to be on screen).
 */

import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrAlert } from 'ngwr/alert';
import { WrAvatar } from 'ngwr/avatar';
import { WrBadge } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrCounter } from 'ngwr/counter';
import { WrIcon } from 'ngwr/icon';
import { WrInput, WrInputGroup, WrInputPrefix } from 'ngwr/input';
import { WrKbd } from 'ngwr/keyboard';
import { WrProgress } from 'ngwr/progress';
import { WrQr } from 'ngwr/qr';
import { WrRating } from 'ngwr/rating';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrSkeleton } from 'ngwr/skeleton';
import { WrSlider } from 'ngwr/slider';
import { WrSpinner } from 'ngwr/spinner';
import { WrStatistic } from 'ngwr/statistic';
import { WrSwitch } from 'ngwr/switch';
import { WrTag } from 'ngwr/tag';
import { WrTypography } from 'ngwr/typography';

@Component({
  selector: 'ngwr-bento-hero',
  templateUrl: './bento-hero.html',
  styleUrl: './bento-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    NgTemplateOutlet,
    WrAlert,
    WrAvatar,
    WrBadge,
    WrButton,
    WrCounter,
    WrIcon,
    WrInput,
    WrInputGroup,
    WrInputPrefix,
    WrKbd,
    WrProgress,
    WrQr,
    WrRating,
    WrSegmented,
    WrSkeleton,
    WrSlider,
    WrSpinner,
    WrStatistic,
    WrSwitch,
    WrTag,
    WrTypography,
  ],
  host: {
    'aria-hidden': 'true',
    class: 'ngwr-bento-hero',
  },
})
export class BentoHero {
  protected readonly today = new Date();
  protected readonly segmented: readonly WrSegmentedOption<string>[] = [
    { label: 'Day', value: 'd' },
    { label: 'Week', value: 'w' },
    { label: 'Month', value: 'm' },
  ];

  // Decorative form-controlled state — wired with [ngModel] so the lib
  // components render their lively variants instead of the empty default.
  protected readonly switchOn = true;
  protected readonly sliderValue = 60;
  protected readonly ratingValue = 4.5;
  protected readonly segmentedValue = 'w';
}
