import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSplashCursor } from 'ngwr/splash-cursor';
import { WrSwitch } from 'ngwr/switch';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-splash-cursor-page',
  templateUrl: './splash-cursor.html',
  imports: [
    FormsModule,
    WrSplashCursor,
    WrSwitch,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class SplashCursorPage {
  /** Opt-in full-viewport overlay (the reactbits default behaviour). */
  protected readonly fullscreen = signal(false);

  // ── Live demo state ─────────────────────────────────────────────
  protected readonly rainbow = signal(true);
  protected readonly color = signal('#5227ff');
  protected readonly splatRadius = signal(0.2);
  protected readonly curl = signal(3);

  protected readonly snippet = computed(() =>
    this.rainbow()
      ? `<wr-splash-cursor [fullscreen]="${this.fullscreen()}" [splatRadius]="${this.splatRadius()}" [curl]="${this.curl()}" />`
      : `<wr-splash-cursor [fullscreen]="${this.fullscreen()}" [rainbow]="false" color="${this.color()}" [splatRadius]="${this.splatRadius()}" [curl]="${this.curl()}" />`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'toggle', label: 'Rainbow', signal: this.rainbow },
    { kind: 'color', label: 'Color', signal: this.color, alpha: false },
    {
      kind: 'slider',
      label: 'Splat Radius',
      signal: this.splatRadius,
      min: 0.05,
      max: 1,
      step: 0.05,
      precision: 2,
    },
    { kind: 'slider', label: 'Curl', signal: this.curl, min: 0, max: 30, step: 1 },
    { kind: 'toggle', label: 'Fullscreen overlay', signal: this.fullscreen },
  ];

  protected readonly snippets = {
    install: `import { WrSplashCursor } from 'ngwr/splash-cursor';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'fullscreen',
      description: 'Viewport overlay, or fill the nearest positioned ancestor.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'simResolution', description: 'Velocity / pressure grid resolution.', type: 'number', default: '128' },
    { name: 'dyeResolution', description: 'Dye texture resolution (visible detail).', type: 'number', default: '1440' },
    {
      name: 'densityDissipation',
      description: 'Dye fade speed — higher, shorter trails.',
      type: 'number',
      default: '3.5',
    },
    { name: 'velocityDissipation', description: 'How fast motion settles.', type: 'number', default: '2' },
    { name: 'pressure', description: 'Pressure retained between frames.', type: 'number', default: '0.1' },
    {
      name: 'pressureIterations',
      description: 'Jacobi iterations for the pressure solve.',
      type: 'number',
      default: '20',
    },
    { name: 'curl', description: 'Vorticity confinement — swirliness.', type: 'number', default: '3' },
    { name: 'splatRadius', description: 'Splat size.', type: 'number', default: '0.2' },
    { name: 'splatForce', description: 'Velocity a pointer move injects.', type: 'number', default: '6000' },
    { name: 'shading', description: 'Pseudo-3D shading on the dye.', type: 'boolean', default: 'true' },
    { name: 'colorUpdateSpeed', description: 'How fast the splat colour cycles.', type: 'number', default: '10' },
    { name: 'rainbow', description: 'Cycle splat colours through the rainbow.', type: 'boolean', default: 'true' },
    { name: 'color', description: 'Fixed splat colour when rainbow is off.', type: 'string', default: "'#ff0000'" },
  ];
}
