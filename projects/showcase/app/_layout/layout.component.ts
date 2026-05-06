import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MetaService } from '#core/services';

@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export default class LayoutComponent implements OnInit {
  private readonly metaService = inject(MetaService);

  ngOnInit(): void {
    this.metaService.setRobots();
  }
}
