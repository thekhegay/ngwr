import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-docs-skills-page',
  templateUrl: './skills.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class SkillsPage {
  protected readonly snippets = {
    install: `# Claude Code
mkdir -p .claude/skills
cp -R node_modules/ngwr/skills/ngwr .claude/skills/ngwr

# Any agent that can read a file
cat node_modules/ngwr/skills/ngwr/SKILL.md`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'MCP Server', url: ['/docs', 'mcp-server'] },
    { kind: 'Guide', title: 'Installation', url: ['/docs', 'installation'] },
  ];
}
