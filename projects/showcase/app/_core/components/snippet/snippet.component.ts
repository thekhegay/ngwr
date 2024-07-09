import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

@Component({
  standalone: true,
  selector: 'ngwr-snippet',
  templateUrl: './snippet.component.html',
  styleUrl: './snippet.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnippetComponent {
  @HostBinding() class = 'ngwr-snippet';
}
