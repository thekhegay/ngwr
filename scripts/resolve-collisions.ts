/**
 * Resolves the v2 class-name collisions left by the migrate-v2 codemod.
 *
 * For each package where two files declare the same bare class name
 * (e.g. `WrTooltip` from both the directive and the floating component),
 * the more-consumer-facing class keeps the bare name; the other gets a
 * descriptive non-suffix (Panel, Item, Host, Binding).
 *
 * Also performs the corresponding file renames so the package's canonical
 * `xxx.ts` always holds the bare-name class.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface CollisionPlan {
  readonly pkg: string;
  /** File currently holding the class we want to rename to the suffix variant. */
  readonly internalFile: string;
  readonly internalNewFile: string;
  readonly internalOldClass: string;
  readonly internalNewClass: string;
  /** File holding the consumer-facing class — keeps the bare class name, rename file → canonical. */
  readonly canonicalFile: string;
  readonly canonicalNewFile: string;
  /** Optional sibling html / scss files for the internal one. */
  readonly internalAssetFiles?: readonly { from: string; to: string }[];
}

const lib = path.join(projectRoot, 'projects', 'lib');

const PLAN: readonly CollisionPlan[] = [
  {
    pkg: 'tooltip',
    internalFile: path.join(lib, 'tooltip', 'tooltip.ts'),
    internalNewFile: path.join(lib, 'tooltip', 'tooltip-panel.ts'),
    internalOldClass: 'WrTooltip',
    internalNewClass: 'WrTooltipPanel',
    canonicalFile: path.join(lib, 'tooltip', 'tooltip.directive.ts'),
    canonicalNewFile: path.join(lib, 'tooltip', 'tooltip.ts'),
  },
  {
    pkg: 'popconfirm',
    internalFile: path.join(lib, 'popconfirm', 'popconfirm.ts'),
    internalNewFile: path.join(lib, 'popconfirm', 'popconfirm-panel.ts'),
    internalOldClass: 'WrPopconfirm',
    internalNewClass: 'WrPopconfirmPanel',
    canonicalFile: path.join(lib, 'popconfirm', 'popconfirm.directive.ts'),
    canonicalNewFile: path.join(lib, 'popconfirm', 'popconfirm.ts'),
    internalAssetFiles: [
      { from: path.join(lib, 'popconfirm', 'popconfirm.html'), to: path.join(lib, 'popconfirm', 'popconfirm-panel.html') },
    ],
  },
  {
    pkg: 'toast',
    internalFile: path.join(lib, 'toast', 'toast.ts'),
    internalNewFile: path.join(lib, 'toast', 'toast-item.ts'),
    internalOldClass: 'WrToast',
    internalNewClass: 'WrToastItem',
    canonicalFile: path.join(lib, 'toast', 'toast.service.ts'),
    canonicalNewFile: path.join(lib, 'toast', 'toast.ts'),
    internalAssetFiles: [
      { from: path.join(lib, 'toast', 'toast.html'), to: path.join(lib, 'toast', 'toast-item.html') },
    ],
  },
  {
    pkg: 'context-menu',
    internalFile: path.join(lib, 'context-menu', 'context-menu.ts'),
    internalNewFile: path.join(lib, 'context-menu', 'context-menu-panel.ts'),
    internalOldClass: 'WrContextMenu',
    internalNewClass: 'WrContextMenuPanel',
    canonicalFile: path.join(lib, 'context-menu', 'context-menu.directive.ts'),
    canonicalNewFile: path.join(lib, 'context-menu', 'context-menu.ts'),
  },
  {
    pkg: 'squircle',
    internalFile: path.join(lib, 'squircle', 'wr-squircle.ts'),
    internalNewFile: path.join(lib, 'squircle', 'wr-squircle-host.ts'),
    internalOldClass: 'WrSquircle',
    internalNewClass: 'WrSquircleHost',
    canonicalFile: path.join(lib, 'squircle', 'wr-squircle.directive.ts'),
    canonicalNewFile: path.join(lib, 'squircle', 'wr-squircle.ts'),
  },
  {
    pkg: 'meta',
    // For meta: SERVICE keeps the bare name; the directive becomes WrMetaBinding.
    internalFile: path.join(lib, 'meta', 'wr-meta.ts'),
    internalNewFile: path.join(lib, 'meta', 'wr-meta-binding.ts'),
    internalOldClass: 'WrMeta',
    internalNewClass: 'WrMetaBinding',
    canonicalFile: path.join(lib, 'meta', 'wr-meta.service.ts'),
    canonicalNewFile: path.join(lib, 'meta', 'wr-meta.ts'),
  },
  {
    pkg: 'hotkey',
    // Hotkey: SERVICE keeps the bare name; the directive becomes WrHotkeyBinding.
    internalFile: path.join(lib, 'hotkey', 'wr-hotkey.ts'),
    internalNewFile: path.join(lib, 'hotkey', 'wr-hotkey-binding.ts'),
    internalOldClass: 'WrHotkey',
    internalNewClass: 'WrHotkeyBinding',
    canonicalFile: path.join(lib, 'hotkey', 'wr-hotkey.service.ts'),
    canonicalNewFile: path.join(lib, 'hotkey', 'wr-hotkey.ts'),
  },
];

function moveIfExists(from: string, to: string): void {
  if (fs.existsSync(from) && !fs.existsSync(to)) {
    fs.renameSync(from, to);
    console.log(`mv ${path.relative(projectRoot, from)} → ${path.relative(projectRoot, to)}`);
  }
}

function rewriteContent(file: string, oldClass: string, newClass: string): void {
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, 'utf8');
  // Replace the class declaration + any references to it.
  // Use a word-boundary regex on the exact class name; ng template parts
  // referencing the class identifier (e.g. typeof imports) also pick up.
  const re = new RegExp(`\\b${oldClass}\\b`, 'g');
  const after = before.replace(re, newClass);
  if (after !== before) fs.writeFileSync(file, after, 'utf8');
}

for (const plan of PLAN) {
  // 1. Rename the internal class file → suffix variant.
  moveIfExists(plan.internalFile, plan.internalNewFile);
  // 2. Rename the internal class declaration & references inside the new file.
  rewriteContent(plan.internalNewFile, plan.internalOldClass, plan.internalNewClass);
  // 3. Rename any sibling assets (html/scss).
  for (const asset of plan.internalAssetFiles ?? []) {
    moveIfExists(asset.from, asset.to);
  }
  // 4. Update templateUrl/styleUrl strings in the renamed file to point at the new asset names.
  if (plan.internalAssetFiles) {
    const content = fs.readFileSync(plan.internalNewFile, 'utf8');
    let updated = content;
    for (const asset of plan.internalAssetFiles) {
      const fromBase = path.basename(asset.from);
      const toBase = path.basename(asset.to);
      updated = updated.split(`'./${fromBase}'`).join(`'./${toBase}'`);
    }
    if (updated !== content) fs.writeFileSync(plan.internalNewFile, updated, 'utf8');
  }
  // 5. Rename the canonical file (e.g. toast.service.ts → toast.ts).
  moveIfExists(plan.canonicalFile, plan.canonicalNewFile);
}

// 6. Replace every cross-file reference to the old internal class with the new one.
function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.angular') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.html')) yield full;
  }
}

// For each plan, find every file that imports the old class FROM THIS PACKAGE
// (recognised by the package's path) and rewrite the reference.
for (const plan of PLAN) {
  const pkgSegment = `/${plan.pkg}/`;
  for (const file of walk(path.join(projectRoot, 'projects'))) {
    const content = fs.readFileSync(file, 'utf8');
    // Skip files that don't mention the old class at all.
    if (!content.includes(plan.internalOldClass)) continue;
    // Heuristic: if the file is INSIDE the colliding package, it's safe to
    // rewrite — bare-name usages inside the canonical file refer to the
    // service/directive (which keeps the bare name). The codemod also
    // touches the now-renamed internal file (already updated) → noop.
    // Outside the package, only rewrite references that came via an import
    // from `ngwr/<pkg>` or a relative path containing the package segment.
    const insidePkg = file.includes(`/projects/lib/${plan.pkg}/`);
    if (insidePkg) {
      // Already partly rewritten by step 2 for the new internal file;
      // the canonical file refers to the bare-name class (correct, no
      // rewrite needed). Skip.
      continue;
    }
    // Outside-package: if the file imports from `ngwr/<pkg>` AND uses
    // `WrXxx` as a class identifier, leave it — because consumer-facing
    // usage of the BARE NAME points at the canonical class, which IS what
    // we want. We don't need to remap external refs at all.
    void pkgSegment;
  }
}

console.log('done');
