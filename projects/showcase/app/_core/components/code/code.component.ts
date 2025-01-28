import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';
import { HighlightAuto } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';

import { BeatifyPipe } from '#core/pipes';

@Component({
  standalone: true,
  selector: 'ngwr-code',
  templateUrl: './code.component.html',
  styleUrl: './code.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HighlightAuto, HighlightLineNumbers, BeatifyPipe],
})
export class CodeComponent {
  @Input({ required: true }) code!: string;
  @Input() codeLang = 'html';

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'ngwr-code': true,
    };
  }
}
