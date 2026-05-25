import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrSquircleComponent, WrSquircleDirective } from 'ngwr/squircle';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-squircle-page',
  templateUrl: './squircle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrSquircleComponent,
    WrSquircleDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class SquirclePageComponent {
  protected readonly radius = signal(28);
  protected readonly smoothing = signal(1);

  protected onRadius(event: Event): void {
    this.radius.set(+(event.target as HTMLInputElement).value);
  }

  protected onSmoothing(event: Event): void {
    this.smoothing.set(+(event.target as HTMLInputElement).value);
  }

  protected readonly snippets = {
    install: `import { WrSquircleComponent, WrSquircleDirective } from 'ngwr/squircle';`,

    standalone: `<wr-squircle [radius]="24" style="width: 160px; height: 160px; background: var(--wr-color-primary)" />`,

    directive: `<!-- works on any element -->
<button wrButton wrSquircle [radius]="16">Save</button>
<wr-tag wrSquircle>v2.0</wr-tag>
<img wrSquircle [radius]="32" src="avatar.jpg" alt="" />`,
  };
}
