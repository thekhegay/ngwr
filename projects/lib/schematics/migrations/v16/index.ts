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
 * It also carries the four inputs and options v16 renamed, and one harness
 * method (see below).
 *
 * **It REWRITES**, in TypeScript:
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
 * No template is touched for these. A template reads its component's members,
 * never an import, so a renamed constant reaches one through a field
 * (`protected readonly KEYS = KEYS`) whose own name is the app's and stays; the
 * initialiser is TypeScript and is rewritten there. No pipe, directive or
 * component was renamed.
 *
 * Where the new name is already taken in the file, the local name stays and
 * only the imported one moves (`import { wrClamp as clamp }`), and the file is
 * listed, since that is the one case left reading the old name.
 *
 * **The renamed inputs and options** are rewritten where the place says whose
 * they are:
 *
 * - `showLabel` on `<wr-slider>` is `showValue`, and `showLabel` / `hideLabel`
 *   on `<wr-password-toggle>` are `showPasswordLabel` / `hidePasswordLabel`:
 *   the attribute and the `[binding]`, in `.html` files and in inline
 *   templates, on that element alone. `showLabel` on anything else stays;
 * - the toast option `dismissible` is `closable`, in an object the file itself
 *   says is a toast's options: the argument of `show()` on something declared
 *   with `WrToast`, an object declared, asserted or `satisfies`-checked as
 *   `WrToastOptions`, and a member read off one. The checker resolves nothing
 *   outside the file, so "declared with" is read off the declaration: its type
 *   or its initialiser names the `ngwr/toast` import;
 * - `isDismissible()` on a `WrToastHarness` is `isClosable()`, on a receiver
 *   declared the same way: typed as the harness, or initialised from a call
 *   that is handed it (`getHarness(WrToastHarness)`, `getAllHarnesses(...)`,
 *   `harnessForFixture(...)`), an element of an array of them included.
 *
 * **It REPORTS**, naming each file and line and changing nothing:
 *
 * - a `dismissible` it could not place, in a file that imports `WrToast` or
 *   `WrToastOptions`: an object passed on through a variable, a spread or a
 *   function is the app's to check;
 * - an `isDismissible()` call it could not tie to the harness, in a file that
 *   imports `WrToastHarness`: a callback parameter, a helper's return value;
 * - `isOpen.set()` / `isOpen.update()` on a `WrPopover`, a `WrDropdown` or a
 *   `WrPopconfirm`, in TypeScript and on a `#ref="wrPopover"` in a template.
 *   The signal is read-only now, and whether the call meant `open()` or
 *   `close()` is the app's to say;
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

type Role = 'toast' | 'options' | 'opener' | 'harness';

/** The imports whose declarations place a renamed option or method, or a read-only signal. */
const WATCHED: Readonly<Record<string, Readonly<Record<string, Role>>>> = {
  'ngwr/toast': { WrToast: 'toast', WrToastOptions: 'options' },
  'ngwr/toast/testing': { WrToastHarness: 'harness' },
  'ngwr/popover': { WrPopover: 'opener' },
  'ngwr/dropdown': { WrDropdown: 'opener' },
  'ngwr/popconfirm': { WrPopconfirm: 'opener' },
};

const DISMISSIBLE = 'dismissible';
const CLOSABLE = 'closable';
const IS_DISMISSIBLE = 'isDismissible';
const IS_CLOSABLE = 'isClosable';

/**
 * What an open tag may hold before the attribute a rule is after: a quoted
 * value consumed only as a pair, or one character that is neither a quote nor
 * `>`. The form `migration-v15` carries, for the reasons it gives: a `>` inside
 * a binding does not end the tag, and no pairing can start at a closing quote.
 */
const IN_TAG = String.raw`(?:"[^"]*"|'[^']*'|[^>"'])*?`;

/** `from` as an attribute or a `[binding]` on `<element>`, and on nothing else. */
const inputOn = (element: string, from: string, to: string): Transform => ({
  pattern: new RegExp(String.raw`(<${element}(?![-\w])${IN_TAG}\s\[?)${from}(?![-\w])`, 'g'),
  replacement: `$1${to}`,
});

const INPUT_RENAMES: readonly Transform[] = [
  inputOn('wr-slider', 'showLabel', 'showValue'),
  inputOn('wr-password-toggle', 'showLabel', 'showPasswordLabel'),
  inputOn('wr-password-toggle', 'hideLabel', 'hidePasswordLabel'),
];

/** A template reference to a popover, a dropdown or a popconfirm: `#menu="wrDropdown"`. */
const OPENER_REF = /#([A-Za-z_$][\w$]*)\s*=\s*["'](?:wrPopover|wrDropdown|wrPopconfirm)["']/g;

/** A file whose markup may hold any of it. Cheap, and wrong only towards reading. */
const MARKUP = /<wr-slider|<wr-password-toggle|wrPopover|wrDropdown|wrPopconfirm/;

/** The entry point v16 made internal. */
const ANIMATIONS_CORE = 'ngwr/animations/core';

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

/** A file worth parsing: it names an entry point this rule knows. Cheap, and wrong only towards parsing. */
const MENTIONS = new RegExp(
  [...Object.keys(RENAMES), ...Object.keys(WATCHED), ANIMATIONS_CORE].map(name => `['"\`]${name}['"\`]`).join('|')
);

const MOCKS = new Set(['mock', 'doMock', 'unmock', 'importActual', 'importMock', 'requireActual']);
const PROMISE_MEMBERS = new Set(['then', 'catch', 'finally']);

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

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
  readonly dismissible: readonly number[];
  readonly harness: readonly number[];
  readonly opens: readonly number[];
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
  const dismissible: number[] = [];
  const harness: number[] = [];
  const opens: number[] = [];
  const replace = (node: ts.Node, text: string): void => {
    edits.push({ start: node.getStart(source), end: node.getEnd(), text });
  };

  /** A named import whose local name is the old one: every use of it moves too. */
  const bindings: { readonly specifier: ts.ImportSpecifier; readonly to: string }[] = [];
  /** A namespace import of a module with renamed exports. */
  const namespaces: { readonly name: ts.Identifier; readonly table: Readonly<Record<string, string>> }[] = [];

  /** A named import this rule reads declarations against. */
  const watched: { readonly name: ts.Identifier; readonly role: Role }[] = [];

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (isCore(statement.moduleSpecifier)) core.push(statement.getStart(source));
      const table = renamesOf(statement.moduleSpecifier);
      const named = statement.importClause?.namedBindings;
      const module = ts.isStringLiteralLike(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '';
      if (named && ts.isNamedImports(named) && Object.hasOwn(WATCHED, module)) {
        for (const specifier of named.elements) {
          const imported = (specifier.propertyName ?? specifier.name).text;
          if (Object.hasOwn(WATCHED[module], imported)) {
            watched.push({ name: specifier.name, role: WATCHED[module][imported] });
          }
        }
      }
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

  const toasts = new Set<ts.Symbol>();
  const toastOptions = new Set<ts.Symbol>();
  const openers = new Set<ts.Symbol>();
  const harnesses = new Set<ts.Symbol>();
  const roles: Readonly<Record<Role, Set<ts.Symbol>>> = {
    toast: toasts,
    options: toastOptions,
    opener: openers,
    harness: harnesses,
  };

  if (bindings.length > 0 || namespaces.length > 0 || watched.length > 0) {
    checker = checkerFor(source);
    for (const { name, role } of watched) {
      const symbol = checker.getSymbolAtLocation(name);
      if (symbol) roles[role].add(symbol);
    }
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

  /** Whether `node` names one of `symbols` anywhere in it. */
  const names = (node: ts.Node | undefined, symbols: ReadonlySet<ts.Symbol>): boolean => {
    if (!node || !checker) return false;
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      return !!symbol && symbols.has(symbol);
    }
    return !!ts.forEachChild(node, child => names(child, symbols) || undefined);
  };

  /** Whether a declaration says, by its type, its initialiser or a decorator, that it holds one of `symbols`. */
  const declaredWith = (declaration: ts.Declaration, symbols: ReadonlySet<ts.Symbol>): boolean => {
    // `const [first] = many` and `for (const one of many)` hold what an element of `many` does.
    if (ts.isBindingElement(declaration) && ts.isArrayBindingPattern(declaration.parent)) {
      return declaredWith(declaration.parent.parent, symbols);
    }
    if (ts.isVariableDeclaration(declaration) && ts.isForOfStatement(declaration.parent.parent)) {
      return names(declaration.type, symbols) || comesFrom(declaration.parent.parent.expression, symbols);
    }
    if (ts.isVariableDeclaration(declaration) || ts.isPropertyDeclaration(declaration) || ts.isParameter(declaration)) {
      return (
        names(declaration.type, symbols) ||
        names(declaration.initializer, symbols) ||
        (ts.canHaveDecorators(declaration) && !!ts.getDecorators(declaration)?.some(d => names(d, symbols)))
      );
    }
    if (ts.isPropertySignature(declaration) || ts.isFunctionLike(declaration)) return names(declaration.type, symbols);
    return false;
  };

  /**
   * Whether `expression` reads something declared with one of `symbols`:
   * `toast`, `this.toast`, `inject(WrToast)`, a signal query read as
   * `this.menu()`, an element of an array of them.
   */
  const comesFrom = (expression: ts.Expression, symbols: ReadonlySet<ts.Symbol>): boolean => {
    if (!checker || symbols.size === 0) return false;
    let current = unwrap(expression);
    while (ts.isCallExpression(current) || ts.isElementAccessExpression(current)) {
      if (ts.isCallExpression(current)) {
        const given = [...current.arguments, ...(current.typeArguments ?? [])];
        if (given.some(node => names(node, symbols))) return true;
      }
      current = unwrap(current.expression);
    }
    const name = ts.isPropertyAccessExpression(current) ? current.name : current;
    if (!ts.isIdentifier(name)) return false;
    return !!checker.getSymbolAtLocation(name)?.declarations?.some(d => declaredWith(d, symbols));
  };

  /** Whether the file itself says this object literal is a toast's options. */
  const isToastOptions = (literal: ts.Expression): boolean => {
    let node: ts.Expression = literal;
    let parent = node.parent;
    while (ts.isParenthesizedExpression(parent) || ts.isArrayLiteralExpression(parent)) {
      node = parent;
      parent = node.parent;
    }
    if (ts.isSatisfiesExpression(parent) || ts.isAsExpression(parent)) return names(parent.type, toastOptions);
    if (ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isParameter(parent)) {
      return parent.initializer === node && names(parent.type, toastOptions);
    }
    return (
      node === literal &&
      ts.isCallExpression(parent) &&
      parent.arguments[0] === literal &&
      ts.isPropertyAccessExpression(parent.expression) &&
      parent.expression.name.text === 'show' &&
      comesFrom(parent.expression.expression, toasts)
    );
  };

  const watchesToast = toasts.size > 0 || toastOptions.size > 0;
  const isDismissible = (name: ts.Node | undefined): name is ts.Identifier | ts.StringLiteral =>
    !!name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === DISMISSIBLE;

  /** The `dismissible` of a toast's options: rewritten where the file places it, listed where it does not. */
  const toastOption = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && isDismissible(node.name)) {
      if (!isToastOptions(node.parent)) dismissible.push(node.getStart(source));
      else if (ts.isIdentifier(node.name)) replace(node.name, CLOSABLE);
      else edits.push({ start: node.name.getStart(source) + 1, end: node.name.getEnd() - 1, text: CLOSABLE });
    } else if (ts.isShorthandPropertyAssignment(node) && isDismissible(node.name)) {
      if (isToastOptions(node.parent)) replace(node.name, `${CLOSABLE}: ${DISMISSIBLE}`);
      else dismissible.push(node.getStart(source));
    } else if (ts.isPropertyAccessExpression(node) && isDismissible(node.name)) {
      if (comesFrom(node.expression, toastOptions)) replace(node.name, CLOSABLE);
      else dismissible.push(node.name.getStart(source));
    } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      if (isDismissible(node.propertyName ?? node.name)) dismissible.push(node.getStart(source));
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) return;

    if (watchesToast) toastOption(node);
    if (
      harnesses.size > 0 &&
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === IS_DISMISSIBLE
    ) {
      if (comesFrom(node.expression.expression, harnesses)) replace(node.expression.name, IS_CLOSABLE);
      else harness.push(node.expression.name.getStart(source));
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'set' || node.expression.name.text === 'update') &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.name.text === 'isOpen' &&
      comesFrom(node.expression.expression.expression, openers)
    ) {
      opens.push(node.getStart(source));
    }

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

  return {
    text,
    core: shifted(core),
    dynamic: shifted(dynamic),
    kept: shifted(kept),
    dismissible: shifted(dismissible),
    harness: shifted(harness),
    opens: shifted(opens),
  };
}

/** Where a template writes the open state of a popover, a dropdown or a popconfirm it holds a reference to. */
function templateOpens(text: string): number[] {
  const refs = new Set([...text.matchAll(OPENER_REF)].map(match => match[1].replace(/\$/g, '\\$')));
  if (refs.size === 0) return [];
  const write = new RegExp(String.raw`(?<![\w$.])(?:${[...refs].join('|')})\??\.isOpen\.(?:set|update)\(`, 'g');
  return [...text.matchAll(write)].map(match => match.index);
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
    const dismissible: Hit[] = [];
    const harness: Hit[] = [];
    const opens: Hit[] = [];
    let rewritten = 0;

    visit(tree, '/', path => {
      const code = isTypeScript(path);
      if (!code && !/\.html$/i.test(path)) return;
      const before = tree.readText(path);
      const markup = MARKUP.test(before);
      const parsed = code && MENTIONS.test(before);
      if (!markup && !parsed) return;

      // An inline template is markup inside a .ts file, so the same rules read both.
      const renamed = markup
        ? INPUT_RENAMES.reduce((text, rule) => text.replace(rule.pattern, rule.replacement), before)
        : before;
      const result = parsed ? migrateFile(path, renamed) : undefined;
      const after = result?.text ?? renamed;
      if (after !== before) {
        tree.overwrite(path, after);
        rewritten += 1;
      }
      const record = (into: Hit[], offsets: readonly number[]): void => {
        if (offsets.length > 0) into.push({ path, lines: linesOf(after, offsets) });
      };
      record(core, result?.core ?? []);
      record(dynamic, result?.dynamic ?? []);
      record(kept, result?.kept ?? []);
      record(dismissible, result?.dismissible ?? []);
      record(harness, result?.harness ?? []);
      record(opens, [...(result?.opens ?? []), ...(markup ? templateOpens(after) : [])]);
    });

    if (rewritten > 0) {
      context.logger.info(
        `ngwr v16 migration: rewrote ${rewritten} file(s): the wr / WR_ / Wr prefix on the functions, constants and ` +
          'types imported from ngwr and every use of them, `dismissible` to `closable` in toast options, ' +
          '`showLabel` to `showValue` on <wr-slider>, `showLabel` / `hideLabel` to `showPasswordLabel` / ' +
          '`hidePasswordLabel` on <wr-password-toggle>, and `isDismissible()` to `isClosable()` on a WrToastHarness.'
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
    warn(
      '`dismissible` that may be a toast option',
      'The toast option is `closable` now, and was renamed where the file says the object is a `WrToastOptions` ' +
        'or goes straight into `WrToast.show()`; these it could not place. Rename the ones a toast reads.',
      dismissible
    );
    warn(
      '`isDismissible()` that may be the toast harness method',
      '`WrToastHarness.isDismissible()` is `isClosable()` now, and was renamed where the file says the receiver is ' +
        'the harness; these it could not tie to one. Rename the ones called on a `WrToastHarness`.',
      harness
    );
    warn(
      '`isOpen.set()` / `isOpen.update()` on a popover, a dropdown or a popconfirm',
      '`isOpen` is a read-only signal now, so the call no longer compiles. Call `open()` or `close()` instead, ' +
        'or `toggle()` on a popover or a dropdown where the call flipped it.',
      opens
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
