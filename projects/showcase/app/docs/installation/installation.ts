import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NGWR_PACKAGE } from '../package-spec';

import { DocCodeComponent, DocInstallComponent, DocPageComponent, DocSectionComponent } from '#core/components';

/** One major line: what it needs. Copied from each line's last release. */
interface CompatRow {
  readonly ngwr: string;
  readonly angular: string;
  readonly cdk: string;
  readonly node: string;
}

/** A stylesheet ngwr ships that no component needs. */
interface OptionalSheet {
  readonly use: string;
  readonly what: string;
  readonly link?: string;
}

/** A schematic and what it does, in one line. */
interface SchematicRow {
  readonly command: string;
  readonly does: string;
}

@Component({
  selector: 'ngwr-installation-page',
  templateUrl: './installation.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocInstallComponent, RouterLink],
})
export default class InstallationPageComponent {
  protected readonly packages = `${NGWR_PACKAGE} @angular/cdk`;

  protected readonly compatibility: readonly CompatRow[] = [
    { ngwr: '15.x', angular: '22', cdk: '22', node: '22.22+, 24.15+, 26' },
    { ngwr: '14.x', angular: '22+', cdk: '22+', node: '22.22+, 24.15+, 26' },
    { ngwr: '7.x to 13.x', angular: '22+', cdk: '22+', node: '24.16+, 26' },
    { ngwr: '6.x', angular: '17+', cdk: '17+', node: '24+' },
    { ngwr: '5.x', angular: '17+', cdk: '17+', node: '20+' },
  ];

  protected readonly optionalSheets: readonly OptionalSheet[] = [
    {
      use: "@use 'ngwr/density';",
      what: 'The density scale. Needed for withDensity() and [wrDensity]',
      link: '/guides/tokens/density',
    },
    { use: "@use 'ngwr/reset';", what: 'A modern CSS reset' },
    { use: "@use 'ngwr/grid';", what: 'A 12-column grid and container', link: '/guides/grid' },
    {
      use: "@use 'ngwr/typography-utilities';",
      what: 'Text utility classes',
      link: '/guides/typography/styles',
    },
    { use: "@use 'ngwr/animations';", what: 'Keyframes and animation classes' },
    { use: "@use 'ngwr/breakpoints' as bp;", what: 'Breakpoint mixins for your own SCSS', link: '/guides/grid' },
  ];

  protected readonly schematics: readonly SchematicRow[] = [
    {
      command: `ng add ${NGWR_PACKAGE}`,
      does: 'Installs peers, adds the theme to styles, prints the providers to paste',
    },
    { command: `ng add ${NGWR_PACKAGE} --styles=theme --density=lg`, does: 'The same without prompts' },
    { command: 'ng g ngwr:use WrButton --path <file>', does: 'Adds the import and puts it in the component imports' },
    {
      command: 'ng g ngwr:provider <name>',
      does: 'Adds a provider to app.config.ts: density, toast, storage or theme inside provideWr(), icons, i18n or loading-bar-router as a call of its own',
    },
    {
      command: 'ng g ngwr:component-style <name>',
      does: "Adds @use 'ngwr/<name>' to global styles, below the theme line",
    },
    { command: 'ng g ngwr:icon-set', does: 'Writes a tree-shaken icon barrel' },
    { command: 'ng g ngwr:page', does: 'Scaffolds a form, table or dashboard page' },
    { command: `ng update ${NGWR_PACKAGE}`, does: 'Updates from any earlier major and runs its migrations' },
  ];

  protected readonly snippets = {
    ngAdd: `ng add ${NGWR_PACKAGE}`,
    styles: `@use 'ngwr/theme';
@use 'ngwr/button';
@use 'ngwr/select';`,
    usage: `import { Component } from '@angular/core';
import { WrButton } from 'ngwr/button';

@Component({
  selector: 'app-root',
  imports: [WrButton],
  template: \`<wr-btn color="primary">Save</wr-btn>\`,
})
export class App {}`,
    icons: `import { Check } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

@Component({
  providers: [provideWrIcons(lucideIcons({ check: Check }))],
  template: \`<wr-btn icon="check">Save</wr-btn>\`,
})
export class App {}`,
    configure: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { withToast } from 'ngwr/toast';

export const appConfig: ApplicationConfig = {
  providers: [provideWr(withDensity(), withToast({ duration: 6000 }))],
};`,
  };
}
