import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-mcp-page',
  templateUrl: './mcp.html',
  imports: [
    RouterLink,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class McpGuidePageComponent {
  protected readonly snippets = {
    claudeCode: `# From your project root. The server is a bin in the package you already
# depend on, so there is nothing extra to install.
claude mcp add ngwr -- npx -y ngwr-mcp`,

    mcpJson: `// .mcp.json at the project root — check it in and every agent on the
// team gets the same catalog.
{
  "mcpServers": {
    "ngwr": {
      "command": "npx",
      "args": ["-y", "ngwr-mcp"]
    }
  }
}`,

    claudeDesktop: `// macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
// Windows: %APPDATA%\\Claude\\claude_desktop_config.json
{
  "mcpServers": {
    "ngwr": {
      "command": "npx",
      "args": ["-y", "ngwr-mcp"]
    }
  }
}`,

    cursor: `// .cursor/mcp.json in the project, or ~/.cursor/mcp.json for every project.
{
  "mcpServers": {
    "ngwr": {
      "command": "npx",
      "args": ["-y", "ngwr-mcp"]
    }
  }
}`,

    pinned: `// Pinned to the copy in node_modules. The answers then come from the
// version your app actually resolves, and start-up fetches nothing.
{
  "mcpServers": {
    "ngwr": {
      "command": "node",
      "args": ["./node_modules/ngwr/mcp/server.js"]
    }
  }
}`,

    byHand: `# Newline-delimited JSON on stdin, one message per line. No client and no
# SDK are involved, which makes a misbehaving setup easy to bisect.
echo '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_ngwr_component","arguments":{"name":"wr-datepicker"}}}' \\
  | node ./node_modules/ngwr/mcp/server.js

# The answer, verbatim. The text an agent reads is content[0].text:
{"jsonrpc":"2.0","id":7,"result":{"content":[{"type":"text","text":"No ngwr entry point matches \\"wr-datepicker\\". Use search_ngwr to find one."}]}}`,

    searchRequest: `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_ngwr","arguments":{"query":"date range picker","limit":3}}}`,

    searchResponse: `## ngwr/date-picker
selector: wr-date-picker, wr-date-range-picker
import: import { WrDatePicker } from 'ngwr/date-picker'
Unified date / time / date-time picker. \`<input>\` + popover for every mode — overlay content swaps based on \`[mode]\`. Parses on every keystroke (silently — only emits when valid), reformats canonical on blur. Format driven by \`WrDateAdapter\`.

## ngwr/date-picker/testing
import: import { WrDatePickerDayHarness } from 'ngwr/date-picker/testing'

## ngwr/color-picker
selector: [wrColorPickerTrigger], wr-color-picker
import: import { WrColorPicker } from 'ngwr/color-picker'
HSV canvas + hue / alpha sliders + HEX / RGB / HSL inputs + optional swatches. Use \`<wr-color-picker>\` inline or anchor it to a button with \`[wrColorPickerTrigger]\`.`,

    componentRequest: `{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_ngwr_component","arguments":{"name":"WrSelect"}}}`,

    componentResponse: `# ngwr/select

Native-like select built on CDK Overlay. A signal-forms native control — it implements \`FormValueControl\`, so \`[formField]\` binds straight to its \`value\` model. \`[(value)]\` works standalone, and \`[(ngModel)]\` / reactive forms keep working through Angular's bridge.

- selector: wr-option-group, wr-option, wr-select
- import: import { WrSelect } from 'ngwr/select'
- styles: @use 'ngwr/select';
- exports: WrSelect, WrOption, WrOptionGroup, WR_SELECT, WrSelectContext, WrSelectMode, WrSelectSearchLoader, WrSelectTagValidator, WrSelectSize
- classes with an API: WrSelect, WrOption, WrOptionGroup (use get_ngwr_api)
- docs: https://ngwr.dev/reference/components/select
- docs as markdown: https://ngwr.dev/reference/components/select.md`,

    apiRequest: `{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_ngwr_api","arguments":{"symbol":"WrAlert"}}}`,

    apiResponse: `# WrAlert — ngwr/alert

Inline status banner. Use for feedback messages — saved/failed/notice etc.

## inputs
- \`closeLabel\`: string | null — Accessible name. Falls back to \`alert.close\`, then \`'Close alert'\`.
- \`title\`: string | null default null — Optional headline shown at the top of the alert.
- \`type\`: WrAlertType default 'info' — Visual variant.
- \`iconName\`: string | null default null — Override the default per-type icon with any ngwr icon name.
- \`message\`: string | null default null — Optional secondary message rendered below the title.
- \`icon\`: boolean default true — When \`true\`, renders a leading status icon matching the \`type\`. Pass \`false\` to hide. Ignored when \`iconName\` is set.
- \`closeable\`: boolean default false — When \`true\`, renders a close button.

## outputs
- \`closed\`: void — Emitted when the user dismisses the alert via the close button.

## Example
\`\`\`html
<wr-alert title="Saved" message="Your changes are live." type="success" />
<wr-alert title="Failed" type="danger" closeable (closed)="onClose()" />
\`\`\`
Docs: https://ngwr.dev/reference/components/alert`,

    setupRequest: `{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"get_ngwr_setup","arguments":{"symbols":["WrSelect","WrDatePicker"]}}}`,

    setupResponse: `# Setting these up

## 1. Install
ng add ngwr
(prompts for styles, date adapter, density and theme, and prints a bootstrap snippet)

## 2. Wire each symbol into the component that uses it
ng g ngwr:use WrSelect --path src/app/some.component.ts   # ngwr/select
ng g ngwr:use WrDatePicker --path src/app/some.component.ts   # ngwr/date-picker

\`--path\` is a NAMED option, not positional — passing it bare fails with \`Unknown argument\`.

## 3. Styles
@use 'ngwr';   // everything, or per component:
@use 'ngwr/select';
@use 'ngwr/date-picker';

## 4. Providers these need
provideWrOverlay() // from 'ngwr/overlay'
   why: overlays render into an ngwr-owned container; without it they never appear
provideWrDateAdapter(wrDateFnsAdapter) // from 'ngwr/date-adapter-fns'
   why: every date mode goes through an adapter; there is no built-in default
`,
  };

  protected readonly tools: readonly DocApiRow[] = [
    {
      name: 'search_ngwr',
      description:
        'Ranked search over the catalog. A name or selector hit outranks a description hit, because a description names neighbours — `wr-drawer` mentions the bottom sheet — and matching there is weaker evidence. Start here when you do not know the entry point name.',
      type: '{ query: string; limit?: number }',
      default: 'limit 10, capped at 40',
    },
    {
      name: 'get_ngwr_component',
      description:
        'One entry point in full: description, selector, exports, import line, SCSS import, which of its exports have an API worth asking about, and both docs URLs. Resolves an entry point (`ngwr/select`, `select`), a symbol (`WrSelect`) or a selector (`wr-select`).',
      type: '{ name: string }',
      default: '—',
    },
    {
      name: 'get_ngwr_api',
      description:
        'The inputs, models, outputs and methods of one class, read out of the `.d.ts` this package ships — the published signature rather than a copy of it. `kind` narrows the surface, which is the difference between forty lines and four.',
      type: "{ symbol: string; kind?: 'all' | 'input' | 'model' | 'output' | 'method' | 'property' }",
      default: "kind 'all'",
    },
    {
      name: 'get_ngwr_setup',
      description:
        'The commands and providers for a set of symbols: install, the `ng g ngwr:use` invocation per symbol, the SCSS to load, and any provider they cannot work without. It returns the commands as text — it does not run them.',
      type: '{ symbols: string[] }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Installation',
      url: ['/start', 'installation'],
      description: 'What `ng add ngwr` does, and the manual path if you would rather do it yourself.',
    },
    {
      kind: 'Guide',
      title: 'Schematics',
      url: ['/start', 'schematics'],
      description: 'The `ng g ngwr:use` generator that `get_ngwr_setup` hands back.',
    },
    {
      kind: 'Guide',
      title: 'Testing',
      url: ['/guides', 'testing'],
      description: 'The CDK harnesses — the `*/testing` entry points that show up in search results.',
    },
  ];
}
