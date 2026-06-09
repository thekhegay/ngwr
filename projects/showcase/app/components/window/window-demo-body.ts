import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import type { WrWindowRef } from 'ngwr/window';
import { WR_WINDOW_DATA, WR_WINDOW_REF } from 'ngwr/window';

interface DemoData {
  readonly message: string;
}

/** Trivial body for the `manager.open()` showcase demo. */
@Component({
  selector: 'ngwr-window-demo-body',
  templateUrl: './window-demo-body.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class WindowDemoBodyComponent {
  protected readonly ref = inject<WrWindowRef<WindowDemoBodyComponent, string>>(WR_WINDOW_REF);
  protected readonly data = inject<DemoData | null>(WR_WINDOW_DATA);

  protected dismiss(): void {
    void this.ref.close('dismissed-from-content');
  }
}
