import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-docs-mcp-page',
  templateUrl: './mcp.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class McpPage {
  protected readonly snippets = {
    claudeCode: `claude mcp add ngwr -- npx -y -p ngwr ngwr-mcp`,

    config: `{
  "mcpServers": {
    "ngwr": {
      "command": "npx",
      "args": ["-y", "-p", "ngwr", "ngwr-mcp"]
    }
  }
}`,

    pinned: `{
  "mcpServers": {
    "ngwr": {
      "command": "node",
      "args": ["./node_modules/ngwr/mcp/server.js"]
    }
  }
}`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Skills', url: ['/docs', 'skills'] },
    { kind: 'Guide', title: 'Installation', url: ['/docs', 'installation'] },
  ];
}
