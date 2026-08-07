import { Component, computed, signal } from '@angular/core';

import { WrGlitchText } from 'ngwr/glitch-text';

import {
  DocApiComponent,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  ReactbitsCredit,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-glitch-text-page',
  templateUrl: './glitch-text.html',
  imports: [
    WrGlitchText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class GlitchTextPage {
  // Live demo state
  protected readonly text = signal('ERROR');
  protected readonly speed = signal(1);
  protected readonly enableShadows = signal(true);
  protected readonly enableOnHover = signal(true);

  protected readonly snippet = computed(
    () =>
      `<wr-glitch-text
  text="${this.text()}"
  [speed]="${this.speed()}"
  [enableShadows]="${this.enableShadows()}"
  [enableOnHover]="${this.enableOnHover()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Speed', signal: this.speed, min: 0.1, max: 3, step: 0.1, precision: 1 },
    { kind: 'toggle', label: 'Shadows', signal: this.enableShadows },
    { kind: 'toggle', label: 'On Hover Only', signal: this.enableOnHover },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text' },
  ];

  protected readonly snippets = {
    install: `import { WrGlitchText } from 'ngwr/glitch-text';`,
  };

  protected readonly api = API.WrGlitchText;
}
