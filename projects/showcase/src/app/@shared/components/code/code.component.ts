import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { SafeAny } from 'ngwr/core/types';
import { isDefined } from 'showcase/@shared/utils/rxjs';

@Component({
  selector: 'ngwr-code[code]',
  templateUrl: './code.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeComponent {
  @Input()
  get code(): string {
    return this._code;
  }
  set code(value: string) {
    if (isDefined(value)) {
      this._code = value;
    }
  }
  private _code: string = '';

  @Input()
  get codeLang(): string | undefined {
    return this._codeLang;
  }
  set codeLang(value: string | undefined) {
    if (isDefined(value)) {
      this._codeLang = value;
    }
  }
  private _codeLang: string | undefined = undefined;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'ngwr-code': true,
    };
  }
}
