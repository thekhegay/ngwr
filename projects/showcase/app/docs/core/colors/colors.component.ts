import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/core/color';
import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-colors',
  templateUrl: './colors.component.html',
  styleUrls: ['./colors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorsComponent implements OnInit {
  readonly colors = wrThemeColors;
  readonly description = 'NGWR includes an color system that themes components out-of-the-box.';

  readonly colorsCode =
    '--wr-color-white: #ffffff;\n--wr-color-black: #000000;\n--wr-color-primary: #3969e2;\n--wr-color-secondary: #f51c6a;\n--wr-color-light: #dee0e8;\n--wr-color-medium: #b5bccc;\n--wr-color-dark: #322e4f;\n--wr-color-success: #40da15;\n--wr-color-warning: #F99B00;\n--wr-color-danger: #e01d34;';

  readonly colorsRgbCode =
    '--wr-color-white-rgb: 255,255,255;\n--wr-color-black-rgb: 0,0,0;\n--wr-color-primary-rgb: 57,105,226;\n--wr-color-secondary-rgb: 245,28,106;\n--wr-color-light-rgb: 222,224,232;\n--wr-color-medium-rgb: 181,188,204;\n--wr-color-dark-rgb: 50,46,79;\n--wr-color-success-rgb: 54,196,14;\n--wr-color-warning-rgb: 255,145,0;\n--wr-color-danger-rgb: 224,29,52;';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Colors');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['colors', 'theme']);
  }
}
