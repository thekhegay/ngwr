import { Component } from '@angular/core';

import { colors } from '../../@shared';

@Component({
  selector: 'site-common-colors',
  templateUrl: './colors.component.html',
  styleUrls: ['./colors.component.scss']
})
export class ColorsComponent {
  readonly colors = colors;
  readonly colorsCode =
    '--wr-color-white: #ffffff;\n--wr-color-black: #000000;\n--wr-color-primary: #3969e2;\n--wr-color-secondary: #f51c6a;\n--wr-color-light: #dee0e8;\n--wr-color-medium: #b5bccc;\n--wr-color-dark: #322e4f;\n--wr-color-success: #40da15;\n--wr-color-warning: #F99B00;\n--wr-color-danger: #e01d34;';

  readonly colorsRgbCode =
    '--wr-color-white-rgb: 255,255,255;\n--wr-color-black-rgb: 0,0,0;\n--wr-color-primary-rgb: 57,105,226;\n--wr-color-secondary-rgb: 245,28,106;\n--wr-color-light-rgb: 222,224,232;\n--wr-color-medium-rgb: 181,188,204;\n--wr-color-dark-rgb: 50,46,79;\n--wr-color-success-rgb: 54,196,14;\n--wr-color-warning-rgb: 255,145,0;\n--wr-color-danger-rgb: 224,29,52;';
}
