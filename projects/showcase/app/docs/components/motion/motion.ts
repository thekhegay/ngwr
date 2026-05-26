import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { WrAnimatedText } from 'ngwr/animated-text';
import { WrAurora } from 'ngwr/aurora';
import { WrConfetti } from 'ngwr/confetti';
import { WrCountUp } from 'ngwr/count-up';
import { WrShimmer, WrSpotlight, WrTilt } from 'ngwr/directives';
import { WrMarquee } from 'ngwr/marquee';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-motion-page',
  templateUrl: './motion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrAnimatedText,
    WrAurora,
    WrCountUp,
    WrMarquee,
    WrShimmer,
    WrSpotlight,
    WrTilt,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class MotionPageComponent {
  private readonly confettiService = inject(WrConfetti);

  protected readonly countTo = signal(12345);
  protected readonly logos = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Cyberdyne', 'Tyrell'];

  protected fireConfetti(): void {
    this.confettiService.fire({ count: 120 });
  }

  protected reroll(): void {
    this.countTo.set(Math.round(1000 + Math.random() * 99000));
  }

  protected readonly snippets = {
    animatedText: `<h2 wr-animated-text [text]="'Decoded'" mode="scramble" />`,
    countUp: `<wr-count-up [to]="value" [decimals]="0" />`,
    shimmer: `<h1 wrShimmer>Premium</h1>`,
    spotlight: `<div wrSpotlight class="card">…</div>`,
    tilt: `<div wrTilt [glare]="true" class="card">…</div>`,
    marquee: `<wr-marquee>…</wr-marquee>`,
    aurora: `<div style="position: relative">
  <wr-aurora />
  <h1 style="position: relative">Welcome</h1>
</div>`,
    confetti: `inject(WrConfetti).fire({ count: 120 });`,
  };
}
