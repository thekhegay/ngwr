import { Component } from '@angular/core';

import { colors } from '../../@shared';

@Component({
  selector: 'site-components-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']
})
export class ButtonComponent {
  readonly colors = colors;

  readonly colorsCode =
    '<wr-btn color="primary"></wr-btn>\n<wr-btn color="secondary"></wr-btn>\n<wr-btn color="success"></wr-btn>\n<wr-btn color="warning"></wr-btn>\n<wr-btn color="danger"></wr-btn>\n<wr-btn color="light"></wr-btn>\n<wr-btn color="medium"></wr-btn>\n<wr-btn color="dark"></wr-btn>';

  readonly outlinedCode =
    '<wr-btn outlined></wr-btn>\n<wr-btn color="secondary" outlined></wr-btn>\n<wr-btn color="success" outlined></wr-btn>\n<wr-btn color="warning" outlined></wr-btn>\n<wr-btn color="danger" outlined></wr-btn>\n<wr-btn color="light" outlined></wr-btn>\n<wr-btn color="medium" outlined></wr-btn>\n<wr-btn color="dark" outlined></wr-btn>';

  readonly roundedCode =
    '<wr-btn rounded></wr-btn>\n<wr-btn color="secondary" rounded></wr-btn>\n<wr-btn color="success" rounded></wr-btn>\n<wr-btn color="warning" rounded></wr-btn>\n<wr-btn color="danger" rounded></wr-btn>\n<wr-btn color="light" rounded></wr-btn>\n<wr-btn color="medium" rounded></wr-btn>\n<wr-btn color="dark" rounded></wr-btn>';

  readonly sizeCode = '<wr-btn>Default size</wr-btn>\n<wr-btn size="small">Small size</wr-btn>';

  readonly fullWidthCode = '<wr-btn fullwidth></wr-btn>';

  readonly iconsCode =
    '<wr-btn icon="add">Add</wr-btn>\n<wr-btn icon="copy-outline" outlined>Copy</wr-btn>\n<wr-btn icon="download" iconPosition="end" color="secondary">Download</wr-btn>\n<wr-btn icon="warning" outlined rounded color="warning">Warning</wr-btn>\n<wr-btn icon="alert-circle" size="small" rounded color="danger">Alert</wr-btn>';

  readonly loadingCode =
    '<wr-btn loading>Loading</wr-btn>\n<wr-btn [loading]="true" color="dark" rounded>You can use long text</wr-btn>\n<wr-btn loading icon="add" color="secondary" outlined>Loading with icon</wr-btn>';

  readonly disabledCode = '<wr-btn disabled>Disabled</wr-btn>';
}