import { Component } from '@angular/core';

import { colors } from '../../@shared';

@Component({
  selector: 'site-components-skeleton',
  templateUrl: './skeleton.component.html'
})
export class SkeletonComponent {
  readonly colors = colors;

  readonly exampleCode =
    '<wr-skeleton style="width:25%; height:1rem"></wr-skeleton>\n<wr-skeleton style="width:50%; height:1rem"></wr-skeleton>\n<wr-skeleton style="width:75%; height:1rem"></wr-skeleton>\n<wr-skeleton style="width:100%; height:1rem"></wr-skeleton>';
  readonly colorsCode =
    '<wr-skeleton color="primary"></wr-skeleton>\n<wr-skeleton color="secondary"></wr-skeleton>\n<wr-skeleton color="success"></wr-skeleton>\n<wr-skeleton color="warning"></wr-skeleton>\n<wr-skeleton color="danger"></wr-skeleton>\n<wr-skeleton color="light"></wr-skeleton>\n<wr-skeleton color="medium"></wr-skeleton>\n<wr-skeleton color="dark"></wr-skeleton>';
}
