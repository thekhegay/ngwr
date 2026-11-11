/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';

/**
 * v15 to v16 migration. v16 put the library's prefix on every public function,
 * constant and type that lacked it: `clamp` is `wrClamp`, `KEYS` is `WR_KEYS`,
 * `Maybe` is `WrMaybe`. A rename is the shape a codemod exists for, since the
 * new name means what the old one meant in the same place.
 *
 * **It REWRITES**, in TypeScript only:
 *
 * - a named import of an old name from the entry point that exported it, and
 *   every use of that binding in the file. `import { clamp as c }` keeps `c`
 *   and changes the imported name alone;
 * - a re-export, `export { clamp } from 'ngwr/utils'`, which becomes
 *   `export { wrClamp as clamp }` so the app's own export keeps its name;
 * - a member of a namespace import, `utils.clamp` and `utils.Maybe`, and of an
 *   inline `import('ngwr/utils').Maybe` type.
 *
 * **Uses are matched by binding, not by spelling.** Half of these names are
 * ordinary words another package exports too: `debounce`, `throttle` and
 * `isObservable` from rxjs, `debounce` and `clamp` from lodash, a `round` or a
 * `noop` of the app's own. So the file is handed to the TypeScript checker, and
 * an identifier moves only when it resolves to the import this rule renamed: a
 * parameter that shadows it, a property of the same name and another package's
 * export all stay. The program holds that one file and resolves nothing, which
 * is enough, because the question is which declaration IN the file a name
 * points at.
 *
 * No template is touched. A template reads its component's members, never an
 * import, so a renamed constant reaches one through a field
 * (`protected readonly KEYS = KEYS`) whose own name is the app's and stays; the
 * initialiser is TypeScript and is rewritten there. No pipe, directive or
 * component was renamed.
 *
 * Where the new name is already taken in the file, the local name stays and
 * only the imported one moves (`import { wrClamp as clamp }`), and the file is
 * listed, since that is the one case left reading the old name.
 *
 * **It REPORTS**, naming each file and line and changing nothing:
 *
 * - an import of `ngwr/animations/core`. The entry point is gone: what the
 *   effects share is internal, and nothing in an app should have reached it;
 * - a `vi.mock()` / `jest.mock()` or an `import()` of an entry point with
 *   renamed exports, where the names are keys of an object this cannot follow.
 *
 * **Registered as `16.0.0`**, which `ng update` also runs for a release
 * candidate and re-runs between candidates (see `migration-v15`), so the rule
 * is idempotent: a second run finds only new names, which the table does not
 * list, and changes nothing.
 */

/** Old name to new, by the entry point that exports it. */
const RENAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'ngwr/utils': {
    badgeLog: 'wrBadgeLog',
    badgeWarn: 'wrBadgeWarn',
    badgeError: 'wrBadgeError',
    clamp: 'wrClamp',
    round: 'wrRound',
    noop: 'wrNoop',
    debounce: 'wrDebounce',
    throttle: 'wrThrottle',
    randomId: 'wrRandomId',
    numAttr: 'wrNumAttr',
    isDefined: 'wrIsDefined',
    isNonEmptyArray: 'wrIsNonEmptyArray',
    isObservable: 'wrIsObservable',
    isSafeCssValue: 'wrIsSafeCssValue',
    toClassList: 'wrToClassList',
    resolveCssColor: 'wrResolveCssColor',
    resolveCssColorChannels: 'wrResolveCssColorChannels',
    resolveCssSize: 'wrResolveCssSize',
    getRootFontSize: 'wrGetRootFontSize',
    getFocusableElements: 'wrGetFocusableElements',
    trapFocus: 'wrTrapFocus',
    watchColorScheme: 'wrWatchColorScheme',
    hasModifier: 'wrHasModifier',
    isComposing: 'wrIsComposing',
    isPrintableKey: 'wrIsPrintableKey',
    KEYS: 'WR_KEYS',
    KEY_LABELS: 'WR_KEY_LABELS',
    Maybe: 'WrMaybe',
    SafeAny: 'WrSafeAny',
    ResolveCssSizeOptions: 'WrResolveCssSizeOptions',
    ResolvedCssSize: 'WrResolvedCssSize',
    WatchColorSchemeOptions: 'WrWatchColorSchemeOptions',
  },
  'ngwr/color-picker': {
    hslToRgb: 'wrHslToRgb',
    hsvToRgb: 'wrHsvToRgb',
    rgbToHsl: 'wrRgbToHsl',
    rgbToHsv: 'wrRgbToHsv',
    parseHex: 'wrParseHex',
    toHex: 'wrToHex',
  },
  'ngwr/icon': {
    lucide: 'wrLucide',
    lucideIcons: 'wrLucideIcons',
    svgIcon: 'wrSvgIcon',
    LucideIconNode: 'WrLucideIconNode',
  },
  'ngwr/date': {
    toLocalDate: 'wrToLocalDate',
    isNamedFormat: 'wrIsNamedFormat',
  },
  'ngwr/hotkey': {
    matchesHotkey: 'wrMatchesHotkey',
    parseHotkeySpec: 'wrParseHotkeySpec',
  },
  'ngwr/i18n': {
    readI18nText: 'wrReadI18nText',
  },
  'ngwr/storage': {
    createMemoryStorage: 'wrCreateMemoryStorage',
  },
  'ngwr/toast': {
    DEFAULT_TOAST_CONFIG: 'DEFAULT_WR_TOAST_CONFIG',
  },
  'ngwr/charts/core': {
    chartAxis: 'wrChartAxis',
    chartColor: 'wrChartColor',
    chartDash: 'wrChartDash',
    chartMarker: 'wrChartMarker',
    chartMarkerExtent: 'wrChartMarkerExtent',
    chartMarkerPath: 'wrChartMarkerPath',
    CHART_PALETTE: 'WR_CHART_PALETTE',
    CHART_DASHES: 'WR_CHART_DASHES',
    CHART_MARKERS: 'WR_CHART_MARKERS',
  },
};

/** The entry point v16 made internal. */
const ANIMATIONS_CORE = 'ngwr/animations/core';

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

/** A file worth parsing: it names an entry point this rule knows. Cheap, and wrong only towards parsing. */
const MENTIONS = new RegExp([...Object.keys(RENAMES), ANIMATIONS_CORE].map(name => `['"\`]${name}['"\`]`).join('|'));

const MOCKS = new Set(['mock', 'doMock', 'unmock', 'importActual', 'importMock', 'requireActual']);
const PROMISE_MEMBERS = new Set(['then', 'catch', 'finally']);

interface Edit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface Hit {
  readonly path: string;
  readonly lines: readonly number[];
}

interface FileResult {
  readonly text: string;
  /** Offsets, in the rewritten text, of what the reports list. */
  readonly core: readonly number[];
  readonly dynamic: readonly number[];
  readonly kept: readonly number[];
}

/** The table for a module specifier, or nothing when the module exported no renamed name. */
function renamesOf(specifier: ts.Expression | undefined): Readonly<Record<string, string>> | undefined {
  if (!specifier || !ts.isStringLiteralLike(specifier)) return undefined;
  return Object.hasOwn(RENAMES, specifier.text) ? RENAMES[specifier.text] : undefined;
}

const isCore = (specifier: ts.Expression | undefined): boolean =>
  !!specifier && ts.isStringLiteralLike(specifier) && specifier.text === ANIMATIONS_CORE;

/** The checker for one file on its own: no lib, no module resolution, nothing read from disk. */
function checkerFor(source: ts.SourceFile): ts.TypeChecker {
  const host: ts.CompilerHost = {
    getSourceFile: name => (name === source.fileName ? source : undefined),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: name => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: name => name === source.fileName,
    readFile: () => undefined,
  };
  const options: ts.CompilerOptions = {
    noLib: true,
    noResolve: true,
    types: [],
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    experimentalDecorators: true,
  };
  return ts.createProgram([source.fileName], options, host).getTypeChecker();
}

/** `expression` with its parentheses, `await` and non-null marks peeled off. */
function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current) || ts.isAwaitExpression(current) || ts.isNonNullExpression(current)) {
    current = current.expression;
  }
  return current;
}

/** The module a dynamic `import('…')` names, when `node` is one. */
function dynamicImportOf(node: ts.Node): ts.Expression | undefined {
  return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
    ? node.arguments[0]
    : undefined;
}

/** The module a `vi.mock('…')` / `jest.mock('…')` family call names, when `node` is one. */
function mockOf(node: ts.Node): ts.Expression | undefined {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return undefined;
  const { expression: owner, name } = node.expression;
  if (!ts.isIdentifier(owner) || (owner.text !== 'vi' && owner.text !== 'jest')) return undefined;
  return MOCKS.has(name.text) ? node.arguments[0] : undefined;
}

function migrateFile(path: string, before: string): FileResult {
  const source = ts.createSourceFile(path, before, ts.ScriptTarget.Latest, true);
  const edits: Edit[] = [];
  const core: number[] = [];
  const dynamic: number[] = [];
  const kept: number[] = [];
  const replace = (node: ts.Node, text: string): void => {
    edits.push({ start: node.getStart(source), end: node.getEnd(), text });
  };

  /** A named import whose local name is the old one: every use of it moves too. */
  const bindings: { readonly specifier: ts.ImportSpecifier; readonly to: string }[] = [];
  /** A namespace import of a module with renamed exports. */
  const namespaces: { readonly name: ts.Identifier; readonly table: Readonly<Record<string, string>> }[] = [];

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (isCore(statement.moduleSpecifier)) core.push(statement.getStart(source));
      const table = renamesOf(statement.moduleSpecifier);
      const named = statement.importClause?.namedBindings;
      if (!table || !named) continue;

      if (ts.isNamespaceImport(named)) {
        namespaces.push({ name: named.name, table });
        continue;
      }
      for (const specifier of named.elements) {
        const imported = specifier.propertyName ?? specifier.name;
        if (!ts.isIdentifier(imported) || !Object.hasOwn(table, imported.text)) continue;
        const to = table[imported.text];
        if (!specifier.propertyName) {
          bindings.push({ specifier, to });
        } else if (specifier.name.text === to) {
          // `clamp as wrClamp`: the alias already is the new name.
          edits.push({ start: imported.getStart(source), end: specifier.name.getEnd(), text: to });
        } else {
          replace(imported, to);
        }
      }
    } else if (ts.isExportDeclaration(statement)) {
      if (isCore(statement.moduleSpecifier)) core.push(statement.getStart(source));
      const table = renamesOf(statement.moduleSpecifier);
      if (!table || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;

      for (const specifier of statement.exportClause.elements) {
        const exported = specifier.propertyName ?? specifier.name;
        if (!ts.isIdentifier(exported) || !Object.hasOwn(table, exported.text)) continue;
        const to = table[exported.text];
        // The name the app's own module exports is the app's API: it stays.
        replace(exported, specifier.propertyName ? to : `${to} as ${exported.text}`);
      }
    }
  }

  // Names the file already uses, so a rename never lands on a taken one.
  const taken = new Set<string>();
  const collect = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) taken.add(node.text);
    ts.forEachChild(node, collect);
  };
  collect(source);

  const moving = new Map<ts.Symbol, string>();
  const spaces = new Map<ts.Symbol, Readonly<Record<string, string>>>();
  let checker: ts.TypeChecker | undefined;

  if (bindings.length > 0 || namespaces.length > 0) {
    checker = checkerFor(source);
    for (const { specifier, to } of bindings) {
      const symbol = checker.getSymbolAtLocation(specifier.name);
      if (taken.has(to) || !symbol) {
        replace(specifier.name, `${to} as ${specifier.name.text}`);
        kept.push(specifier.getStart(source));
      } else {
        replace(specifier.name, to);
        moving.set(symbol, to);
      }
    }
    for (const { name, table } of namespaces) {
      const symbol = checker.getSymbolAtLocation(name);
      if (symbol) spaces.set(symbol, table);
    }
  }

  const memberOf = (owner: ts.Node, member: ts.Node): void => {
    if (!checker || spaces.size === 0 || !ts.isIdentifier(owner)) return;
    const symbol = checker.getSymbolAtLocation(owner);
    const table = symbol && spaces.get(symbol);
    if (!table) return;
    if (ts.isIdentifier(member) && Object.hasOwn(table, member.text)) {
      replace(member, table[member.text]);
    } else if (ts.isStringLiteralLike(member) && Object.hasOwn(table, member.text)) {
      // `utils['clamp']`: the quotes stay as written.
      edits.push({ start: member.getStart(source) + 1, end: member.getEnd() - 1, text: table[member.text] });
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) return;

    const loaded = dynamicImportOf(node);
    const mocked = mockOf(node);
    if (isCore(loaded) || isCore(mocked)) {
      core.push(node.getStart(source));
    } else if (renamesOf(mocked)) {
      dynamic.push(node.getStart(source));
    } else if (renamesOf(loaded)) {
      // `(await import('ngwr/utils')).clamp` is rewritten below; any other use,
      // `.then(m => …)` included, hands the module to code this cannot follow.
      let outer = node.parent;
      while (ts.isParenthesizedExpression(outer) || ts.isAwaitExpression(outer) || ts.isNonNullExpression(outer)) {
        outer = outer.parent;
      }
      if (!ts.isPropertyAccessExpression(outer) || PROMISE_MEMBERS.has(outer.name.text)) {
        dynamic.push(node.getStart(source));
      }
    }

    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      if (isCore(node.argument.literal)) core.push(node.getStart(source));
      const table = renamesOf(node.argument.literal);
      let first: ts.EntityName | undefined = node.qualifier;
      while (first && ts.isQualifiedName(first)) first = first.left;
      if (table && first && Object.hasOwn(table, first.text)) replace(first, table[first.text]);
    } else if (ts.isPropertyAccessExpression(node)) {
      const table = renamesOf(dynamicImportOf(unwrap(node.expression)));
      if (table && Object.hasOwn(table, node.name.text)) replace(node.name, table[node.name.text]);
      else memberOf(node.expression, node.name);
    } else if (ts.isElementAccessExpression(node)) {
      memberOf(node.expression, node.argumentExpression);
    } else if (ts.isQualifiedName(node)) {
      memberOf(node.left, node.right);
    } else if (checker && moving.size > 0) {
      if (ts.isShorthandPropertyAssignment(node)) {
        // `{ clamp }` builds a property called `clamp`: the key stays, the value moves.
        const symbol = checker.getShorthandAssignmentValueSymbol(node);
        const to = symbol && moving.get(symbol);
        if (to) replace(node.name, `${node.name.text}: ${to}`);
        if (node.objectAssignmentInitializer) visit(node.objectAssignmentInitializer);
        return;
      }
      if (ts.isExportSpecifier(node)) {
        // A local `export { clamp }`: same reason as a re-export.
        const symbol = checker.getExportSpecifierLocalTargetSymbol(node);
        const to = symbol && moving.get(symbol);
        const local = node.propertyName ?? node.name;
        if (to && ts.isIdentifier(local)) replace(local, node.propertyName ? to : `${to} as ${local.text}`);
        return;
      }
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        const to = symbol && moving.get(symbol);
        if (to) replace(node, to);
        return;
      }
    }

    ts.forEachChild(node, visit);
  };
  for (const statement of source.statements) visit(statement);

  // Right to left, so no edit moves the range of one still to apply. An
  // offset a report holds is then shifted by every edit that ended before it.
  edits.sort((a, b) => b.start - a.start);
  let text = before;
  for (const edit of edits) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);

  const shifted = (offsets: readonly number[]): number[] =>
    offsets.map(offset =>
      edits.reduce((at, edit) => (edit.end <= offset ? at + edit.text.length - (edit.end - edit.start) : at), offset)
    );

  return { text, core: shifted(core), dynamic: shifted(dynamic), kept: shifted(kept) };
}

/** The 1-based lines `offsets` fall on, each once, in order. */
function linesOf(text: string, offsets: readonly number[]): number[] {
  const lines = new Set<number>();
  for (const offset of offsets) {
    let line = 1;
    for (let i = text.indexOf('\n'); i >= 0 && i < offset; i = text.indexOf('\n', i + 1)) line += 1;
    lines.add(line);
  }
  return [...lines].sort((a, b) => a - b);
}

const isTypeScript = (path: string): boolean => /\.(?:ts|mts|cts|tsx)$/i.test(path) && !/\.d\.[mc]?ts$/i.test(path);

function ngUpdateV16(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const core: Hit[] = [];
    const dynamic: Hit[] = [];
    const kept: Hit[] = [];
    let rewritten = 0;

    visit(tree, '/', path => {
      if (!isTypeScript(path)) return;
      const before = tree.readText(path);
      if (!MENTIONS.test(before)) return;

      const result = migrateFile(path, before);
      if (result.text !== before) {
        tree.overwrite(path, result.text);
        rewritten += 1;
      }
      const record = (into: Hit[], offsets: readonly number[]): void => {
        if (offsets.length > 0) into.push({ path, lines: linesOf(result.text, offsets) });
      };
      record(core, result.core);
      record(dynamic, result.dynamic);
      record(kept, result.kept);
    });

    if (rewritten > 0) {
      context.logger.info(
        `ngwr v16 migration: rewrote ${rewritten} file(s): the wr / WR_ / Wr prefix on the functions, constants and ` +
          'types imported from ngwr, and every use of them.'
      );
      context.logger.info('Verify the result with `git diff` — a few edge cases may need manual touch-up.');
    }

    let reported = 0;
    const warn = (lead: string, body: string, hits: readonly Hit[]): void => {
      if (hits.length === 0) return;
      reported += 1;
      context.logger.warn(`ngwr v16: ${lead} in ${hits.length} file(s). ${body}`);
      for (const { path, lines } of hits) context.logger.warn(`  ${path}:${lines.join(', ')}`);
    };

    warn(
      'ngwr/animations/core',
      'The entry point is gone: what the effects share is internal now, and an import of it fails the build. ' +
        'Import the effect itself from ngwr/animations/<name>, and keep a copy of any helper you used.',
      core
    );
    warn(
      'a mock or a dynamic import of an entry point with renamed exports',
      'The names are keys of an object here, which this cannot follow. Rename them by hand from the table in ' +
        'MIGRATION.md: a mock factory that still returns the old key leaves the new export undefined.',
      dynamic
    );
    warn(
      'an import renamed under its old local name',
      'The new name was already taken in the file, so the import reads `{ wrX as x }` and its uses are unchanged. ' +
        'It builds as it is; rename the binding when the clash is gone.',
      kept
    );

    if (rewritten === 0 && reported === 0) {
      context.logger.info('ngwr v16 migration: nothing to do — no affected usage found.');
    }

    return tree;
  };
}

function visit(tree: Tree, path: string, visitor: (filePath: string) => void): void {
  const dir = tree.getDir(path);
  for (const file of dir.subfiles) visitor(`${path === '/' ? '' : path}/${file}`);
  for (const sub of dir.subdirs) {
    if (IGNORE_DIRS.has(sub)) continue;
    visit(tree, `${path === '/' ? '' : path}/${sub}`, visitor);
  }
}

export default ngUpdateV16;
