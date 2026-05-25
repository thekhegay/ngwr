import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { WrAnimatedTextComponent } from 'ngwr/animated-text';
import { WrAuroraComponent } from 'ngwr/aurora';
import { WrConfettiService } from 'ngwr/confetti';
import { WrCountUpComponent } from 'ngwr/count-up';
import { WrShimmerDirective, WrSpotlightDirective, WrTiltDirective } from 'ngwr/directives';
import { WrMarqueeComponent } from 'ngwr/marquee';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-motion-page',
  templateUrl: './motion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrAnimatedTextComponent,
    WrAuroraComponent,
    WrCountUpComponent,
    WrMarqueeComponent,
    WrShimmerDirective,
    WrSpotlightDirective,
    WrTiltDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class MotionPageComponent {
  private readonly confettiService = inject(WrConfettiService);

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
    confetti: `inject(WrConfettiService).fire({ count: 120 });`,
  };
}
