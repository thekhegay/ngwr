import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-overlay-page',
  templateUrl: './overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class OverlayPageComponent {
  protected readonly snippets = {
    setup: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrOverlay } from 'ngwr/overlay';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrOverlay(),
  ],
});`,
    scopeCss: `// Scope custom overlay styles to NGWR overlays so other libs aren't affected.
.wr-overlay-container .cdk-overlay-pane {
  z-index: 1100;
}`,
    components: `// Overlay-based building blocks shipped by the lib:
import { WrDialogService }      from 'ngwr/dialog';
import { WrToastService }       from 'ngwr/toast';
import { WrDrawerComponent }    from 'ngwr/drawer';
import { WrTooltipDirective }   from 'ngwr/tooltip';
import { WrPopoverDirective }   from 'ngwr/popover';
import { WrPopconfirmDirective } from 'ngwr/popconfirm';
import { WrDropdownDirective }  from 'ngwr/dropdown';
import { WrSelectComponent }    from 'ngwr/select';`,
  };
}
