import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'ngwr-snippet',
  templateUrl: './snippet.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnippetComponent {
  @Input() codeLang: string | undefined = undefined;
}
