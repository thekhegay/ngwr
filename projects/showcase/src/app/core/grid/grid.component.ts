import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridComponent implements OnInit {
  readonly exampleCode =
    '<div class="grid">\n  <div class="col-6">.col-6</div>\n  <div class="col-6">.col-6</div>\n  <div class="col-6">.col-6</div>\n  <div class="col-6">.col-6</div>\n</div>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Grid');
    this.seoService.setDescription('NGWR css grid');
    this.seoService.setKeywords(['grid', 'css grid']);
  }
}
