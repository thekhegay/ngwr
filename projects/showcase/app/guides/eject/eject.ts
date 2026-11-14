import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

interface Option {
  readonly name: string;
  readonly does: string;
}

interface Change {
  readonly what: string;
  readonly after: string;
}

@Component({
  selector: 'ngwr-gs-eject-page',
  templateUrl: './eject.html',
  imports: [RouterLink, DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class EjectGuidePageComponent {
  protected readonly snippets = {
    command: `ng g ngwr:eject button`,

    options: `ng g ngwr:eject charts/bar-chart --path src/app/ui/bar-chart
ng g ngwr:eject button --dry-run
ng g ngwr:eject button --from ../ngwr`,

    use: `// before
import { WrButton } from 'ngwr/button';

// after
import { WrButton } from './ngwr/button';`,

    styles: `// styles.scss
@use 'ngwr/theme';
@use './app/ngwr/button/styles';`,

    back: `rm -r src/app/ngwr/button`,
  };

  protected readonly options: readonly Option[] = [
    { name: '<entry>', does: 'The path under ngwr/: button, select, charts/bar-chart. A bare bar-chart works too' },
    { name: '--path', does: 'Where the copy goes. Default: src/app/ngwr/<entry>' },
    { name: '--from', does: 'A local checkout of the ngwr repository to copy from, for work offline' },
    { name: '--dry-run', does: 'Lists the files and writes nothing' },
  ];

  protected readonly changes: readonly Change[] = [
    { what: 'The component', after: 'Yours. Edit the template, the styles and the class freely' },
    { what: 'ng update', after: 'Skips the copy: no fixes, no migrations, no new inputs' },
    { what: 'Everything else', after: 'Still the package: the copy imports ngwr/utils, ngwr/icon, ngwr/theme' },
    { what: 'Selector and classes', after: 'The same names as the package' },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
    { kind: 'Docs', title: 'Installation', url: ['/docs', 'installation'] },
    { kind: 'Docs', title: 'Migration', url: ['/docs', 'migration'] },
  ];
}
