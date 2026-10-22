# <a href="https://ngwr.dev"><img src="https://ngwr.dev/images/logo.svg" alt="ngwr" height="32"></a>

Signals-first UI components for Angular.

[![ngwr website](https://img.shields.io/badge/ngwr.dev-3969e2)](https://ngwr.dev)
[![npm version](https://img.shields.io/npm/v/ngwr?color=e21a62)](https://www.npmjs.com/package/ngwr)
[![angular peer](https://img.shields.io/npm/dependency-version/ngwr/peer/@angular/core)](https://www.npmjs.com/package/ngwr)
[![ci](https://img.shields.io/github/actions/workflow/status/thekhegay/ngwr/ci.yml?branch=main&label=ci)](https://github.com/thekhegay/ngwr/actions/workflows/ci.yml)
[![coverage](https://codecov.io/gh/thekhegay/ngwr/branch/main/graph/badge.svg)](https://codecov.io/gh/thekhegay/ngwr)
[![license](https://img.shields.io/npm/l/ngwr)](https://github.com/thekhegay/ngwr/blob/main/LICENSE)

[Documentation](https://ngwr.dev) · [Getting started](https://ngwr.dev/docs/installation) · [Playground](https://stackblitz.com/github/thekhegay/ngwr/tree/main/projects/starter?file=src/app/app.ts) · [Changelog](https://github.com/thekhegay/ngwr/blob/main/CHANGELOG.md)

ngwr's form controls implement `FormValueControl` and `FormCheckboxControl`
from Signal Forms directly. `[formField]` binds to each component's own `value`
or `checked` model, and the library contains no `ControlValueAccessor`.

```ts
import { Component, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'signup-card',
  imports: [FormField, WrCheckbox, WrFormField, WrInput],
  template: `
    <wr-form-field label="Work email" required>
      <input wrInput type="email" [formField]="signup.email" />
    </wr-form-field>

    <wr-checkbox [formField]="signup.agree">I agree to the terms</wr-checkbox>
  `,
})
export class SignupCard {
  private readonly model = signal({ email: '', agree: false });

  readonly signup = form(this.model, path => {
    required(path.email, { message: 'Enter your work email.' });
    email(path.email, { message: 'That is not an email address.' });
  });
}
```

`<wr-form-field>` shows each rule's `message`, so there is no error markup to
write. ngwr ships no validation copy of its own: for a rule without a message,
the field reads `validation.<key>` from your i18n catalog. Template-driven and
reactive forms bind too, with limits the
[forms guide](https://ngwr.dev/guides/forms) lists.

## Features

- Standalone, signal-based components that work zoneless and render on the
  server.
- One import path per component (`ngwr/button`, `ngwr/select`). No runtime
  dependencies.
- [Theming](https://ngwr.dev/guides/theming) through `--wr-*` CSS custom
  properties, with light and dark modes that follow `color-scheme`.
- Keyboard and screen reader support based on the WAI-ARIA patterns.
- Translatable built-in labels and right-to-left layouts.
- Angular CDK [test harnesses](https://ngwr.dev/guides/testing) for the form
  controls and overlays.

Browse the [components](https://ngwr.dev/reference/components),
[charts](https://ngwr.dev/charts) and [bits](https://ngwr.dev/bits) (animations
and visual effects) with live demos. Directives, pipes, services and validators
are in the [reference](https://ngwr.dev/reference).

## Installation

```sh
ng add ngwr
```

The schematic asks a few questions, adds `@use 'ngwr/theme';` to your global
Sass stylesheet and prints the providers to add to your app.

Or install the packages yourself:

```sh
pnpm add ngwr @angular/cdk
# or
npm install ngwr @angular/cdk
# or
yarn add ngwr @angular/cdk
```

The optional packages are an icon set, shown in the
[installation guide](https://ngwr.dev/docs/installation), and ProseMirror for
the [editor](https://ngwr.dev/reference/components/editor).

## Styles

One `@use` per thing you render, with the token layer on the first line. There
is no umbrella stylesheet: each component brings the theme with it and Sass
emits it once, but only a module's first load can take `with ()`, which is
where `$base-colors` goes.

```scss
// styles.scss
@use 'ngwr/theme';
@use 'ngwr/form';
@use 'ngwr/input';
@use 'ngwr/checkbox';
```

Utilities are opt-in. Write them below `@use 'ngwr/theme'`, since some of them
load the token layer too:

```scss
@use 'ngwr/reset'; // box-sizing, body margin, sane defaults
@use 'ngwr/grid'; // .grid, .container, .col-*
@use 'ngwr/animations'; // .wr-animate-* classes
@use 'ngwr/typography-utilities'; // .wr-text-*, .wr-font-* classes
@use 'ngwr/breakpoints' as bp; // Sass mixins only, no CSS output
```

## Configuration

Nothing has to be configured. When you want app-wide settings, they go through
one `provideWr()` call, with a feature for each thing you set, imported from
its own entry point:

```ts
import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { withTheme } from 'ngwr/theme';

providers: [
  provideWr(
    withDensity({ defaultDensity: 'sm' }),
    withTheme({ defaultMode: 'dark' }),
  ),
],
```

`withDensity()` and the `[wrDensity]` directive also need
`@use 'ngwr/density';` in your styles: no component loads the density scale.
Icons and translations have calls of their own. The
[configuration guide](https://ngwr.dev/docs/configuration) lists every feature.

## Upgrading

```sh
ng update ngwr
```

This installs the latest version and runs its migrations. The
[migration guide](https://ngwr.dev/docs/migration) describes the changes in
each major. The Angular badge shows the Angular versions ngwr supports, and
[SECURITY.md](https://github.com/thekhegay/ngwr/blob/main/SECURITY.md) lists the
majors that still get fixes.

## AI agents

ngwr ships `ngwr-mcp`, an MCP server that lets coding agents search the catalog
and read component APIs. Add it to your client:

```json
{
  "mcpServers": {
    "ngwr": { "command": "npx", "args": ["-y", "-p", "ngwr", "ngwr-mcp"] }
  }
}
```

The [MCP guide](https://ngwr.dev/docs/mcp-server) covers each client. Agents
without MCP can use the [agent skill](https://ngwr.dev/docs/skills),
[llms.txt](https://ngwr.dev/llms.txt), or any docs page as markdown by adding
`.md` to its URL.

## Contributing

Bug reports go to [issues](https://github.com/thekhegay/ngwr/issues/new/choose)
and questions to [Discussions](https://github.com/thekhegay/ngwr/discussions).
Read [CONTRIBUTING.md](https://github.com/thekhegay/ngwr/blob/main/CONTRIBUTING.md)
before opening a pull request, and report security issues privately as
[SECURITY.md](https://github.com/thekhegay/ngwr/blob/main/SECURITY.md) describes.

## License

[MIT](https://github.com/thekhegay/ngwr/blob/main/LICENSE) © [Roman Khegay](https://github.com/thekhegay)
