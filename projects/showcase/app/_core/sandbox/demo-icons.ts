/**
 * The icon names a docs snippet may use, as SOURCE for the generated project.
 *
 * It mirrors `#core/icons/common-icons.ts` and cannot import it: that file
 * exports built `WrIconDef`s — SVG strings, already resolved — while a sandbox
 * needs the `import { Check } from 'lucide'` line that produced them. So the
 * two lists have to agree by hand. They are the same twenty-two names the
 * showcase registers at its root, which is exactly the set a snippet on the
 * site can assume; a page-local name renders nothing and logs, because
 * `<wr-icon>` reports an unknown name rather than throwing (one exception in a
 * view abandons every effect after it).
 */
const DEMO_ICONS: Readonly<Record<string, string>> = {
  'arrow-back': 'ArrowLeft',
  'arrow-down': 'ArrowDown',
  'arrow-forward': 'ArrowRight',
  'arrow-up': 'ArrowUp',
  'caret-back': 'ChevronLeft',
  'caret-down': 'ChevronDown',
  'caret-forward': 'ChevronRight',
  'caret-up': 'ChevronUp',
  checkmark: 'Check',
  'chevron-down': 'ChevronDown',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'chevron-up': 'ChevronUp',
  close: 'X',
  copy: 'Copy',
  eye: 'Eye',
  'eye-off': 'EyeOff',
  filter: 'Funnel',
  monitor: 'Monitor',
  search: 'Search',
  smartphone: 'Smartphone',
  time: 'Clock',
};

/** `src/app/icons.ts` — the barrel `ng g ngwr:icon-set` would have written. */
function renderIconsFile(): string {
  const nodes = [...new Set(Object.values(DEMO_ICONS))].sort((a, b) => a.localeCompare(b));
  const entries = Object.entries(DEMO_ICONS).map(([name, node]) =>
    /^[a-z][\w$]*$/.test(name) ? `  ${name}: ${node},` : `  '${name}': ${node},`
  );

  return [
    `import { ${nodes.join(', ')} } from 'lucide';`,
    `import { lucideIcons } from 'ngwr/icon/adapters/lucide';`,
    '',
    '// The set ngwr.dev registers at its root, so a name used in the docs draws',
    '// here too. Swap in your own — `ng g ngwr:icon-set` writes this file for you.',
    'export const DEMO_ICONS = lucideIcons({',
    ...entries,
    '});',
    '',
  ].join('\n');
}

export { renderIconsFile };
