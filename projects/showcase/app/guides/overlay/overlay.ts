import { Component } from '@angular/core';

import { WrKbd } from 'ngwr/keyboard';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-overlay-page',
  templateUrl: './overlay.html',
  imports: [WrKbd, DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class OverlayPageComponent {
  protected readonly snippets = {
    focusInitial: `<!-- Inside the dialog's own component template. \`cdkFocusInitial\` is a plain
     attribute the CDK focus trap looks up — nothing to import. -->
<h2 wrDialogTitle>Delete project</h2>
<p>This cannot be undone.</p>

<footer>
  <button wr-btn type="button" cdkFocusInitial [wrDialogClose]="false">Cancel</button>
  <button wr-btn type="button" color="danger" [wrDialogClose]="true">Delete</button>
</footer>`,

    scopeCss: `// Scope custom overlay styles to NGWR overlays so other libs aren't affected.
// Not a z-index: CDK 22 promotes overlays into the top layer, which no
// z-index reaches.
.wr-overlay-container .cdk-overlay-pane {
  font-size: var(--wr-text-sm);
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
