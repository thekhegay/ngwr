import { ChangeDetectorRef, Directive, HostBinding, HostListener, Input, Optional } from '@angular/core';

import { SafeAny } from 'ngwr/core/types';
import { WrDialogRef } from 'ngwr/dialog/dialog-ref';

@Directive({
  selector: '[wr-dialog-close], [wrDialogClose]',
  exportAs: 'wrDialogClose',
})
export class WrDialogClose {
  @HostListener('click', ['$event'])
  _onButtonClick(event: MouseEvent): void {
    event.preventDefault();
    this.dialogRef.close(undefined);
  }

  constructor(@Optional() public dialogRef: WrDialogRef) {}
}

@Directive({
  selector: '[wr-dialog-title], [wrDialogTitle]',
  exportAs: 'wrtDialogTitle',
})
export class WrDialogTitle {
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-dialog__title': true,
    };
  }
}

@Directive({
  selector: `[wr-dialog-content], wr-dialog-content, [wrDialogContent]`,
})
export class WrDialogContent {
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-dialog__content': true,
    };
  }
}

@Directive({
  selector: `[wr-dialog-footer], wr-dialog-footer, [wrDialogFooter]`,
})
export class WrDialogFooter {
  @Input()
  get position(): 'start' | 'center' | 'end' {
    return this._position;
  }
  set position(value: 'start' | 'center' | 'end') {
    this._position = value;
    this.cdr.markForCheck();
  }
  private _position: 'start' | 'center' | 'end' = 'end';

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-dialog__footer': true,
      'wr-dialog__footer--start': this.position === 'start',
      'wr-dialog__footer--center': this.position === 'center',
      'wr-dialog__footer--end': this.position === 'end',
    };
  }

  constructor(private readonly cdr: ChangeDetectorRef) {}
}
