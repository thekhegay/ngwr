/**
 * One-off helper for the v2 migration: rename the `WrIcon` *type* to
 * `WrIconDef` so it stops colliding with the `WrIcon` *class* (component).
 *
 * Scans the icon package + every consumer in the workspace, replaces the
 * type token in specific syntactic positions only — never touching the
 * component class identifier.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.angular') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (full.endsWith('.ts')) yield full;
  }
}

// Patterns that uniquely identify the *type* WrIcon (not the class):
// 1. `import type { ... WrIcon ... } from`
// 2. `import { ..., type WrIcon, ... } from`
// 3. `: WrIcon` (type annotation)
// 4. `<WrIcon>` (generic arg)
// 5. `as WrIcon` (type assertion)
// 6. `interface WrIcon {` / `type WrIcon =` (declaration)
const TRANSFORMS: readonly { readonly re: RegExp; readonly to: string }[] = [
  { re: /\binterface WrIcon\b/g, to: 'interface WrIconDef' },
  { re: /\btype WrIcon\s*=/g, to: 'type WrIconDef =' },
  { re: /(:\s*)WrIcon\b/g, to: '$1WrIconDef' },
  { re: /<WrIcon([>,\s])/g, to: '<WrIconDef$1' },
  { re: /,\s*WrIcon([>,\s])/g, to: ', WrIconDef$1' },
  { re: /\bas WrIcon\b/g, to: 'as WrIconDef' },
  { re: /\btype WrIcon([,\s}])/g, to: 'type WrIconDef$1' },
  // export type { ..., WrIcon, ... }
  { re: /\bexport type\s*\{([^}]*)\bWrIcon\b/g, to: (match: string) => match.replace(/\bWrIcon\b/, 'WrIconDef') as never },
  // Special: the import in icon.ts has `import type { WrIcon, WrIconName }`.
  // The first WrIcon is the type, second isn't. Use `type WrIcon` pattern
  // (handled above) OR a leading `{ WrIcon,` form:
  { re: /\{\s*WrIcon\s*,/g, to: '{ WrIconDef,' },
  { re: /,\s*WrIcon\s*\}/g, to: ', WrIconDef }' },
];

let changedFiles = 0;
let totalReplacements = 0;

for (const file of walk(path.join(projectRoot, 'projects'))) {
  let content = fs.readFileSync(file, 'utf8');
  const before = content;
  for (const { re, to } of TRANSFORMS) {
    content = content.replace(re, typeof to === 'string' ? to : (to as unknown as () => string));
  }
  if (content !== before) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    const diff = (before.match(/WrIcon\b/g) ?? []).length - (content.match(/WrIcon\b/g) ?? []).length;
    totalReplacements += diff;
  }
}

console.log(`Rewrote ${changedFiles} files, ${totalReplacements} occurrences of WrIcon → WrIconDef.`);
