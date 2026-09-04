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
  selector: 'ngwr-gs-agent-skill-page',
  templateUrl: './agent-skill.html',
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
export default class AgentSkillGuidePageComponent {
  protected readonly snippets = {
    layout: `node_modules/ngwr/skills/ngwr/
├── SKILL.md                  # ~1 page: frontmatter + the rules that are not guessable
└── references/
    ├── catalog.md            # every entry point, its import line and its selector(s)
    └── setup.md              # bootstrap, styles, providers with no default`,

    install: `# Claude Code, project-scoped — the agent picks it up from .claude/skills.
mkdir -p .claude/skills
cp -R node_modules/ngwr/skills/ngwr .claude/skills/ngwr

# Or read it in place, from any agent that can open a file:
cat node_modules/ngwr/skills/ngwr/SKILL.md`,
  };

  protected readonly contents: readonly DocApiRow[] = [
    {
      name: 'Get the facts, do not guess',
      type: 'section',
      description:
        "The four sources in the package, ordered — the skill's own catalog, `llms-full.txt`, the `.md` twin of any docs page, and the MCP server. Plus the rule that matters most: read an input name, never invent one.",
      default: '—',
    },
    {
      name: 'The rules that are not guessable',
      type: 'section',
      description:
        'Import from the entry point and not a barrel; `wr-btn`, not `wr-button`; check for a MODE before reaching for another component; no `ControlValueAccessor`; `checkboxValue` over `value`; styles are opt-in and global; `.wr-*` classes and `--wr-*` properties are public API; `-contrast` versus `-ink`; no hard-coded strings.',
      default: '—',
    },
    {
      name: 'Setting a component up',
      type: 'section',
      description:
        '`ng add ngwr`, `ng g ngwr:use` with `--path` as a NAMED option, and the providers a component cannot work without — each one a case where it compiles, renders nothing useful, and gives no error naming the cause. `provideWrLoadingBarRouter()` joined that list in v14, when router integration became opt-in.',
      default: '—',
    },
    {
      name: 'Testing',
      type: 'section',
      description:
        'Reach for the `ngwr/<name>/testing` harness instead of querying the DOM, and load the overlay ones from `documentRootLoader` — the panel is not in the fixture.',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'MCP server',
      url: ['/guides', 'mcp'],
      description: 'The askable half of the same stack — search the catalog and read a published API from your agent.',
    },
    {
      kind: 'Guide',
      title: 'Installation',
      url: ['/start', 'installation'],
      description: 'What `ng add ngwr` does, and the manual path if you would rather do it yourself.',
    },
    {
      kind: 'Guide',
      title: 'Testing',
      url: ['/guides', 'testing'],
      description: 'The CDK harnesses the skill tells an agent to reach for.',
    },
  ];
}
