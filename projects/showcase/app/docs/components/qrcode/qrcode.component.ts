import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from '#core/services';
import { RouterLink } from '@angular/router';
import { WrQrModule } from 'ngwr/qr';
import { WrTagModule } from 'ngwr/tag';
import { CodeComponent, SnippetComponent } from '#core/components';

@Component({
    selector: 'ngwr-qrcode',
    templateUrl: './qrcode.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, WrQrModule, WrTagModule, CodeComponent, SnippetComponent]
})
export class QRCodeComponent implements OnInit {
  readonly description: string = 'A component used when some data needs to be converted into a QR Code';

  readonly importCode: string =
    "import { WrQRCodeModule } from 'ngwr/qrcode';\n\n@NgModule({\n  imports: [\n    // ...\n    WrQRCodeModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string = '<wr-qrcode value="https://ngwr.dev"></wr-qrcode>';
  readonly sizeCode: string =
    '<wr-qrcode [size]="75"></wr-qrcode>\n<wr-qrcode [size]="125"></wr-qrcode>\n<wr-qrcode [size]="150"></wr-qrcode>';
  readonly levelCode: string =
    '<wr-qrcode level="L"></wr-qrcode>\n<wr-qrcode level="M"></wr-qrcode>\n<wr-qrcode level="Q"></wr-qrcode>\n<wr-qrcode level="H"></wr-qrcode>';
  readonly iconsCode: string =
    '<wr-qrcode icon="logo-stingray"></wr-qrcode>\n<wr-qrcode icon="https://cdn.glitch.com/4c9ebeb9-8b9a-4adc-ad0a-238d9ae00bb5%2Fmdn_logo-only_color.svg"></wr-qrcode>';
  readonly colorCode: string = '<wr-qrcode color="#3969e2"></wr-qrcode>\n<wr-qrcode color="#f51c6a"></wr-qrcode>';
  readonly bgCode: string = '<wr-qrcode bgColor="#3969e2"></wr-qrcode>\n<wr-qrcode bgColor="#f51c6a"></wr-qrcode>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('QRCode');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['qrcode', 'wr-qrcode']);
  }
}
