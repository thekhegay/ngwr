import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-overlay-page',
  templateUrl: './overlay.html',
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
import { WrDialog }      from 'ngwr/dialog';
import { WrToast }       from 'ngwr/toast';
import { WrDrawer }    from 'ngwr/drawer';
import { WrPopover }   from 'ngwr/popover';  // also covers tooltip via mode="tooltip"
import { WrPopconfirm } from 'ngwr/popconfirm';
import { WrDropdown }  from 'ngwr/dropdown';
import { WrSelect }    from 'ngwr/select';`,
  };
}
