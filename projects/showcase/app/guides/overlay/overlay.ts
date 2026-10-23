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
    focusInitial: `<h2 wrDialogTitle>Delete project</h2>
<p>This cannot be undone.</p>

<footer>
  <button wr-btn type="button" cdkFocusInitial [wrDialogClose]="false">Cancel</button>
  <button wr-btn type="button" color="danger" [wrDialogClose]="true">Delete</button>
</footer>`,

    scopeCss: `.wr-overlay-container .cdk-overlay-pane {
  font-size: var(--wr-text-sm);
}`,
  };
}
