import { Component } from '@angular/core';

import { NGWR_PACKAGE } from '../package-spec';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocCodeFile,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-docs-mcp-page',
  templateUrl: './mcp.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class McpPage {
  protected readonly add: readonly DocCodeFile[] = [
    { label: 'Claude Code', language: 'bash', code: `claude mcp add ngwr -- npx -y -p ${NGWR_PACKAGE} ngwr-mcp` },
    // The `--` keeps the server's own flags away from gemini's option parser.
    { label: 'Gemini CLI', language: 'bash', code: `gemini mcp add ngwr npx -- -y -p ${NGWR_PACKAGE} ngwr-mcp` },
    { label: 'Codex', language: 'bash', code: `codex mcp add ngwr -- npx -y -p ${NGWR_PACKAGE} ngwr-mcp` },
  ];

  protected readonly config: readonly DocCodeFile[] = [
    {
      label: 'JSON',
      language: 'typescript',
      code: `{
  "mcpServers": {
    "ngwr": {
      "command": "npx",
      "args": ["-y", "-p", "${NGWR_PACKAGE}", "ngwr-mcp"]
    }
  }
}`,
    },
    {
      label: 'Codex',
      language: 'toml',
      code: `[mcp_servers.ngwr]
command = "npx"
args = ["-y", "-p", "${NGWR_PACKAGE}", "ngwr-mcp"]`,
    },
  ];

  protected readonly pinned: readonly DocCodeFile[] = [
    {
      label: 'JSON',
      language: 'typescript',
      code: `{
  "mcpServers": {
    "ngwr": {
      "command": "node",
      "args": ["./node_modules/ngwr/mcp/server.js"]
    }
  }
}`,
    },
    {
      label: 'Codex',
      language: 'toml',
      code: `[mcp_servers.ngwr]
command = "node"
args = ["./node_modules/ngwr/mcp/server.js"]`,
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Skills', url: ['/docs', 'skills'] },
    { kind: 'Guide', title: 'Installation', url: ['/docs', 'installation'] },
  ];
}
