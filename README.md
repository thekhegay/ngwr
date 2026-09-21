# <a href="https://ngwr.dev"><img src="https://ngwr.dev/images/logo.svg" alt="ngwr" height="32"></a>

Signals-first UI components for Angular.

[![ngwr website](https://img.shields.io/badge/ngwr.dev-3969e2)](https://ngwr.dev)
[![npm version](https://img.shields.io/npm/v/ngwr?color=e21a62)](https://www.npmjs.com/package/ngwr)
[![angular peer](https://img.shields.io/npm/dependency-version/ngwr/peer/@angular/core)](https://www.npmjs.com/package/ngwr)
[![ci](https://img.shields.io/github/actions/workflow/status/thekhegay/ngwr/ci.yml?branch=main&label=ci)](https://github.com/thekhegay/ngwr/actions/workflows/ci.yml)
[![coverage](https://codecov.io/gh/thekhegay/ngwr/branch/main/graph/badge.svg)](https://codecov.io/gh/thekhegay/ngwr)
[![license](https://img.shields.io/npm/l/ngwr)](https://github.com/thekhegay/ngwr/blob/main/LICENSE)

[Documentation](https://ngwr.dev) · [Getting started](https://ngwr.dev/start/installation) · [Playground](https://ngwr.dev/start/playground) · [Why ngwr](https://ngwr.dev/start/comparison) · [Changelog](https://github.com/thekhegay/ngwr/blob/main/CHANGELOG.md)

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
    required(path.email);
    email(path.email);
  });
}
```

`<wr-form-field>` shows the validation messages itself, so there is no error
markup to write. Template-driven and reactive forms bind too, with limits the
[forms guide](https://ngwr.dev/guides/forms) lists.

## Features

- Standalone, signal-based components that work zoneless and render on the
  server.
- One import path per component (`ngwr/button`, `ngwr/select`). The only
  runtime dependency is `tslib`.
- [Theming](https://ngwr.dev/guides/theming) through `--wr-*` CSS custom
  properties, with light and dark modes.
- Keyboard and screen reader support based on the WAI-ARIA patterns.
- Translatable built-in labels and right-to-left layouts.
- Angular CDK [test harnesses](https://ngwr.dev/guides/testing) for the form
  controls and overlays.

Browse the [components](https://ngwr.dev/reference/components) and
[animations](https://ngwr.dev/animations) with live demos. Directives, pipes,
services and validators are in the [reference](https://ngwr.dev/reference).

## Installation

```sh
ng add ngwr
```

The schematic asks a few questions, adds `@use 'ngwr';` to your global Sass
stylesheet and prints the providers to add to your app.

Or install the packages yourself:

```sh
pnpm add ngwr @angular/cdk
# or
npm install ngwr @angular/cdk
# or
yarn add ngwr @angular/cdk
```

The optional packages (a date library, an icon set, ProseMirror for the editor)
are listed in the [installation guide](https://ngwr.dev/start/installation).

## Styles

```scss
// styles.scss
@use 'ngwr';
```

This loads the theme and the styles of every component. To keep the stylesheet
small, load only the components you use. Each entry brings the theme with it:

```scss
@use 'ngwr/form';
@use 'ngwr/input';
@use 'ngwr/checkbox';
```

Utilities are opt-in and are not part of `@use 'ngwr'`:

```scss
@use 'ngwr/reset'; // box-sizing, body margin, sane defaults
@use 'ngwr/grid'; // .grid, .container, .col-*
@use 'ngwr/animations'; // .wr-animate-* classes
@use 'ngwr/typography-utilities'; // .wr-text-*, .wr-font-* classes
@use 'ngwr/breakpoints' as bp; // Sass mixins only, no CSS output
```

## Upgrading

```sh
ng update ngwr
```

This installs the latest version and runs its migrations. The
[migration guide](https://ngwr.dev/start/migration) describes the changes in
each major. The Angular badge shows the lowest Angular version ngwr needs.
[Versioning](https://ngwr.dev/start/versioning) explains the support policy.

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

The [MCP guide](https://ngwr.dev/guides/mcp) covers each client. Agents without
MCP can use the [agent skill](https://ngwr.dev/guides/agent-skill),
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
