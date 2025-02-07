/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, HostListener, Optional } from '@angular/core';

import { WrDialogRef } from './dialog-ref';

@Directive({
  selector: `[wrDialogClose]`,
})
export class WrDialogCloseDirective {
  @HostListener('click', ['$event'])
  _onButtonClick(event: MouseEvent): void {
    event.preventDefault();
    this.dialogRef.close(undefined);
  }

  constructor(@Optional() public dialogRef: WrDialogRef) {}
}
