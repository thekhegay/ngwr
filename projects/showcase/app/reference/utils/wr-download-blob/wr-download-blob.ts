import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-download-blob-page',
  templateUrl: './wr-download-blob.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrDownloadBlobPage {
  protected readonly snippet = `import { wrDownloadBlob } from 'ngwr/utils';

const csv = new Blob(['id,name\\r\\n1,Ada'], { type: 'text/csv;charset=utf-8;' });
wrDownloadBlob(csv, 'users.csv');`;

  protected readonly headerSnippet = `import { HttpClient } from '@angular/common/http';
import { wrContentDispositionFileName, wrDownloadBlob } from 'ngwr/utils';

this.http.get('/api/report', { observe: 'response', responseType: 'blob' }).subscribe(res => {
  const name = wrContentDispositionFileName(res.headers.get('Content-Disposition'));
  wrDownloadBlob(res.body!, name ?? 'report.pdf');
});`;

  protected readonly formsSnippet = `wrContentDispositionFileName('attachment; filename="report.csv"');
// 'report.csv'

wrContentDispositionFileName("attachment; filename=plain.csv; filename*=UTF-8''%E2%82%AC.csv");
// '€.csv': filename* wins, percent-decoded

wrContentDispositionFileName("attachment; filename*=UTF-8''%E2%82; filename=safe.csv");
// 'safe.csv': a broken filename* falls back to filename

wrContentDispositionFileName('inline');
// null`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDownloadBlob(blob, fileName)',
      description:
        'Saves `blob` under `fileName` through a temporary anchor. Removes the anchor after the click and revokes the object URL on a timer. Does nothing on the server.',
      type: '(blob: Blob, fileName: string) => void',
      default: '-',
    },
    {
      name: 'wrContentDispositionFileName(header)',
      description:
        'The file name in a `Content-Disposition` header, or `null`. Prefers `filename*` (percent-decoded) over `filename`, accepts quoted and unquoted values, ignores parameter case. A `filename*` that cannot be decoded falls back to `filename`.',
      type: '(header: string | null | undefined) => string | null',
      default: '-',
    },
  ];
}
