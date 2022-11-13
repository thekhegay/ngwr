import { Component, Input } from '@angular/core';

@Component({
  selector: 'wr-snippet',
  templateUrl: './snippet.component.html',
  styleUrls: ['./snippet.component.scss']
})
export class SnippetComponent {
  @Input() codeLang: string | undefined = undefined;
}
