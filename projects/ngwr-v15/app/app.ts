import { Component, ViewEncapsulation, inject } from '@angular/core';

import { WrAurora } from 'ngwr/bits/aurora';
import { WrBlurText } from 'ngwr/bits/blur-text';
import { WrBorderGlow } from 'ngwr/bits/border-glow';
import { WrCircularText } from 'ngwr/bits/circular-text';
import { WrClickSpark } from 'ngwr/bits/click-spark';
import { WrDecryptText } from 'ngwr/bits/decrypt-text';
import { WrFallingText } from 'ngwr/bits/falling-text';
import { WrFuzzyText } from 'ngwr/bits/fuzzy-text';
import { WrGlitchText } from 'ngwr/bits/glitch-text';
import { WrGradientText } from 'ngwr/bits/gradient-text';
import { WrMarquee, type WrMarqueeItem } from 'ngwr/bits/marquee';
import { WrRotatingText } from 'ngwr/bits/rotating-text';
import { WrShinyText } from 'ngwr/bits/shiny-text';
import { WrSplashCursor } from 'ngwr/bits/splash-cursor';
import { WrSplitText } from 'ngwr/bits/split-text';
import { WrSpotlightCard } from 'ngwr/bits/spotlight-card';
import { WrStarBorder } from 'ngwr/bits/star-border';
import { WrTiltCard } from 'ngwr/bits/tilt-card';
import { WrTypewriter } from 'ngwr/bits/typewriter';
import { WrWaves } from 'ngwr/bits/waves';
import { WrTheme } from 'ngwr/theme';

/** The sandbox host. Everything below is a docs snippet, copied as written. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    WrAurora,
    WrBlurText,
    WrBorderGlow,
    WrCircularText,
    WrClickSpark,
    WrDecryptText,
    WrFallingText,
    WrFuzzyText,
    WrGlitchText,
    WrGradientText,
    WrMarquee,
    WrRotatingText,
    WrShinyText,
    WrSplashCursor,
    WrSplitText,
    WrSpotlightCard,
    WrStarBorder,
    WrTiltCard,
    WrTypewriter,
    WrWaves,
  ],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);
  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  /** Data-URI SVGs so the sandbox needs no network. */
  protected readonly items: readonly WrMarqueeItem[] = ['Angular', 'Signals', 'Zoneless', 'Standalone'].map(label => ({
    src: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="36"><rect width="160" height="36" rx="8" fill="%233969e2"/><text x="80" y="23" font-family="sans-serif" font-size="14" fill="white" text-anchor="middle">${label}</text></svg>`
    )}`,
    alt: label,
  }));
}
