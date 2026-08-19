/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type ApiMember, declaredClasses, extractClass } from './api.js';

/**
 * The declaration reader's spec.
 *
 * Every fixture below is emitted-`.d.ts` shape, copied from what ng-packagr
 * actually writes into `dist/lib/types/`: four-space members, both namespace
 * aliases (`_angular_core.` and `i0.`), `private` fields with no type,
 * constructors, getters, abstract members, and the `ɵcmp` line carrying the
 * input map. A scanner tested against tidied-up TypeScript would pass and then
 * meet the real file.
 *
 * The case this file exists for is `required`. `input()` and `input.required()`
 * both emit `InputSignal<T>`, so required-ness is knowable ONLY from the `ɵcmp`
 * declaration — a first version inferred it from the type and marked every
 * input required, which is the kind of wrong answer an agent acts on. The two
 * inputs in the fixture differ in the map and are identical in the type.
 */

/** A component as ng-packagr flattens it, panel class first so the name-prefix case is real. */
const SELECT = `
import * as _angular_core from '@angular/core';

/**
 * The panel WrSelect opens. Declared first so that a search for a class whose
 * name is a prefix of this one has something to trip over.
 */
declare class WrSelectPanel {
    readonly hasScroll: _angular_core.InputSignal<boolean>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<WrSelectPanel, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<WrSelectPanel, "wr-select-panel", never, { "hasScroll": { "alias": "hasScroll"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

/**
 * Dropdown select — single, multi, search and tag modes in one component.
 *
 * @example
 * <wr-select [options]="options" [(value)]="value" />
 *
 * @see https://ngwr.dev/reference/components/select
 */
declare class WrSelect<T> {
    /** Options the panel renders. */
    readonly options: _angular_core.InputSignal<readonly T[]>;
    /**
     * Placeholder shown while nothing is chosen.
     *
     * @default null
     */
    readonly placeholder: _angular_core.InputSignal<string | null>;
    /** Accessible name for the trigger. */
    readonly ariaLabel: _angular_core.InputSignal<string | null>;
    /**
     * Disable the control.
     *
     * @default false
     */
    readonly disabled: _angular_core.InputSignalWithTransform<boolean, unknown>;
    /** Group labels, keyed by group id. */
    readonly labels: _angular_core.InputSignal<Record<string, readonly string[]>>;
    /** The chosen value. */
    readonly value: _angular_core.ModelSignal<T | null>;
    /** Emitted when the panel opens. */
    readonly opened: _angular_core.OutputEmitterRef<void>;
    /** The trigger element, for consumers that need to measure it. */
    readonly trigger: _angular_core.ElementRef<HTMLElement> | null;
    protected readonly resolvedSize: _angular_core.InputSignal<string>;
    private readonly overlay;
    /** Move focus to the trigger. */
    focus(): void;
    /** Open the panel, optionally at an option. */
    open(index?: number): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<WrSelect<any>, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<WrSelect<any>, "wr-select", never, { "options": { "alias": "options"; "required": true; "isSignal": true; }; "placeholder": { "alias": "placeholder"; "required": false; "isSignal": true; }; "ariaLabel": { "alias": "aria-label"; "required": false; "isSignal": true; }; "disabled": { "alias": "disabled"; "required": false; "isSignal": true; }; "labels": { "alias": "labels"; "required": false; "isSignal": true; }; "value": { "alias": "value"; "required": false; "isSignal": true; }; }, { "value": "valueChange"; "opened": "opened"; }, never, never, true, never>;
}

export { WrSelect, WrSelectPanel };
`;

/** A doc block that belongs to the type above the class, not to the class. */
const DETACHED = `
/** Visual variant of the alert. */
type WrAlertType = 'info' | 'success';

declare class WrLoner {
    readonly type: InputSignal<WrAlertType>;
}
`;

const INHERITED = `
/** Shared base for the chart family. */
declare abstract class WrChartBase {
    /** The series to plot. */
    readonly data: _angular_core.InputSignal<readonly number[]>;
}

/** Vertical bars, one series. */
declare class WrBarChart extends WrChartBase {
    /** Bar colour override. */
    readonly color: _angular_core.InputSignal<string | null>;
}
`;

/**
 * A service, in the shapes that defeated the pattern-matching reader.
 *
 * Every shape is copied from the shipped declarations: the untyped `private
 * readonly` fields, the `constructor`, the getter and the three-type-parameter
 * `open` from `ngwr-dialog.d.ts`, and `bind`'s callback parameter — a `)` in
 * the middle of the list — from `ngwr-hotkey.d.ts`. The reader that matched one
 * regular expression per member let its optional JSDoc prefix grow over every
 * one of those, so `WrDialog.open` — the only reason to inject the service —
 * was missing from the catalog and the raw source arrived as the next member's
 * prose.
 */
const DIALOG = `
import { ComponentType } from '@angular/cdk/portal';
import * as i0 from '@angular/core';

/** Opens a component in an overlay, and hands back a handle on it. */
declare class WrDialog {
    private readonly overlay;
    private readonly parentInjector;
    constructor(id: number, onDismiss: (id: number) => void);
    /** The dialog on top, if any. */
    get top(): WrDialogRef<unknown> | null;
    /** Open a component in a dialog. */
    open<C, R = unknown, D = unknown>(component: ComponentType<C>, options?: WrDialogOptions<D>): WrDialogRef<C, R>;
    /** Run a handler while a key combination is held. */
    bind(spec: WrHotkeySpec, handler: (event: KeyboardEvent) => void, options?: WrHotkeyOptions): WrHotkeyHandle;
    static ɵprov: i0.ɵɵInjectableDeclaration<WrDialog>;
}
`;

/**
 * An abstract base under the `i0` alias, carrying the shapes that got mangled.
 *
 * ng-packagr writes Angular as `i0` in 25 of the 167 shipped declaration files
 * and as `_angular_core` in the other 99, so a reader that knows only one of
 * them is blind to a sixth of the library. `rowKey` is `wr-table`'s own type,
 * and `loading` is its own doc comment — the tag on the same line as the prose,
 * which JSDoc allows and a line-based reader misses.
 */
const TABLE = `
import * as i0 from '@angular/core';

/** Shared base for the table family. */
declare abstract class WrTableBase<T> {
    /** Row identity, by key or by function. */
    readonly rowKey: i0.InputSignal<string | ((row: T) => unknown) | null>;
    /** Show the loading overlay. @default false */
    readonly loading: i0.InputSignalWithTransform<boolean, unknown>;
    /** The rows to render. */
    abstract rows(): readonly T[];
}
`;

/**
 * A generic whose constraint is written inline in the type parameters.
 *
 * The `{` of `<T extends { id: string }>` comes BEFORE the one that opens the
 * class body. No class in the catalog is written this way TODAY — `WrMention<T
 * extends WrMentionItem>` is as close as it gets, and it names its constraint —
 * so this is the one fixture here with no live casualty behind it. Inlining a
 * row shape on a generic component is one edit away, and the failure it caused
 * is total: the class answers with the constraint's members and none of its own.
 */
const GENERIC = `
declare class WrGrid<T extends { id: string }> {
    /** The rows. */
    readonly items: _angular_core.InputSignal<readonly T[]>;
    /** Scroll to a row. */
    scrollToRow(index: number): void;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<WrGrid<any>, "wr-grid", never, { "items": { "alias": "items"; "required": true; "isSignal": true; }; }, {}, never, never, true, never>;
}
`;

/**
 * A member whose type is a nested object literal, documented on the inside.
 *
 * The apostrophe in the nested comment is the point: a scanner that treats a
 * comment as code opens a string on it that never closes.
 */
const NESTED = `
declare class WrPoller {
    /** How the poller behaves. */
    readonly config: {
        /** How long to wait — don't rush it. */
        delay: number;
    };
    /** Stop polling. */
    stop(): void;
}
`;

/**
 * Inputs whose types are string literals made of the punctuation a scanner counts.
 *
 * Between them they carry every character the reader tracks: the `>` that closes
 * a wrapper and the `,` that separates its arguments, both inside quotes. No
 * shipped type is written this way today — every separator in the catalog is
 * declared as `string` — so this is a shape the reader has to survive rather than
 * one it currently meets.
 */
const LITERAL = `
declare class WrBreadcrumbs {
    /** What to draw between the items. */
    readonly separator: _angular_core.InputSignal<'/' | '>' | ', '>;
    /** What the collapsed items are joined with. */
    readonly joiner: _angular_core.InputSignal<', ' | ' | '>;
}
`;

/**
 * A directive whose input map writes `alias` last.
 *
 * Every one of the 144 maps in the catalog today happens to write `alias` first
 * and `required` second; nothing in the compiler promises that, and the map is
 * the only place required-ness is written down at all.
 */
const KEY_ORDER = `
import * as i0 from '@angular/core';

declare class WrTooltip {
    /** The text to show. */
    readonly text: i0.InputSignal<string>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<WrTooltip, "[wrTooltip]", never, { "text": { "required": true; "isSignal": true; "alias": "wrTooltip"; }; }, {}, never, never, true, never>;
}
`;

/** `@internal` as a tag on one member, and as prose inside another one's example. */
const INTERNAL = `
declare class WrIconRegistry {
    /**
     * Register a set of icons by name.
     *
     * @example
     * \`\`\`ts
     * registry.register({ check });
     * @internal names in the declarations are not part of this map.
     * \`\`\`
     */
    register(icons: Record<string, string>): void;
    /**
     * The raw store.
     *
     * @internal
     */
    store(): Map<string, string>;
}
`;

/**
 * A `get`/`set` pair, and an auto-accessor, as TypeScript emits both.
 *
 * The catalog ships six getters today and no pair and no auto-accessor, so both
 * shapes are one `set` away rather than currently broken.
 */
const ACCESSORS = `
declare class WrTour {
    /** The step showing now. */
    get index(): number;
    set index(next: number);
    /** The label on the current step. */
    accessor label: string;
}
`;

/** The member with a given name, or a failure that names the missing one. */
const memberOf = (members: readonly ApiMember[], name: string): ApiMember => {
  const found = members.find(member => member.name === name);
  if (!found) throw new Error(`no member named ${name}; got ${members.map(member => member.name).join(', ')}`);

  return found;
};

const selectMembers = (): readonly ApiMember[] => extractClass(SELECT, 'WrSelect')?.members ?? [];
const dialogMembers = (): readonly ApiMember[] => extractClass(DIALOG, 'WrDialog')?.members ?? [];
const tableMembers = (): readonly ApiMember[] => extractClass(TABLE, 'WrTableBase')?.members ?? [];

describe('declaredClasses', () => {
  it('lists every class a declaration file declares, abstract included', () => {
    // The abstract one is a real shape in this package — the date adapters and
    // the harness bases are both emitted that way.
    expect(declaredClasses(INHERITED)).toEqual(['WrChartBase', 'WrBarChart']);
    expect(declaredClasses(SELECT)).toEqual(['WrSelectPanel', 'WrSelect']);
  });

  it('lists nothing for a file that only declares types and constants', () => {
    expect(declaredClasses("type WrKey = 'a' | 'b';\ndeclare const wrEn: object;\n")).toEqual([]);
  });
});

describe('extractClass', () => {
  it('returns null for a class the file does not declare', () => {
    // `get_ngwr_api` turns this into "X is not a class in ngwr/y", which is the
    // answer for the type aliases and provider functions entry points export.
    expect(extractClass(SELECT, 'WrNotHere')).toBeNull();
  });

  it('picks the class named, not one whose name it is a prefix of', () => {
    const found = extractClass(SELECT, 'WrSelect');

    // `WrSelectPanel` is declared first. Without the word boundary this returns
    // the panel's single input under the name `WrSelect`.
    expect(found?.name).toBe('WrSelect');
    expect(found?.members.map(member => member.name)).not.toContain('hasScroll');
  });

  it('reads the summary and the @see link off the class doc', () => {
    const found = extractClass(SELECT, 'WrSelect');

    // The summary stops at the first tag — an `@example` block must not bleed
    // into the one-line description an agent reads first.
    expect(found?.description).toBe('Dropdown select — single, multi, search and tag modes in one component.');
    expect(found?.docs).toBe('https://ngwr.dev/reference/components/select');
  });

  it('leaves the description empty when the doc block belongs to something else', () => {
    const found = extractClass(DETACHED, 'WrLoner');

    // Only a comment with nothing but whitespace between it and the class is
    // that class's doc. Otherwise every class would inherit the summary of the
    // type alias above it.
    expect(found?.description).toBe('');
    expect(found?.docs).toBeNull();
  });

  it('reads required-ness from the ɵcmp map rather than from the type', () => {
    const members = selectMembers();

    // Both are `InputSignal<T>`. Only the declaration says which one a template
    // MUST bind, and the answer is one each — a version that inferred this from
    // the type reported every input as required.
    expect(memberOf(members, 'options')).toMatchObject({ type: 'readonly T[]', required: true });
    expect(memberOf(members, 'placeholder')).toMatchObject({ type: 'string | null', required: false });
  });

  it('reads the alias from the declaration, and only when it differs', () => {
    const members = selectMembers();

    // `ariaLabel` is bound as `aria-label`; an agent handed the property name
    // writes a binding Angular ignores.
    expect(memberOf(members, 'ariaLabel').alias).toBe('aria-label');
    expect(memberOf(members, 'options').alias).toBeNull();
  });

  it('reads the input map whatever order its keys are written in', () => {
    const text = memberOf(extractClass(KEY_ORDER, 'WrTooltip')?.members ?? [], 'text');

    // The pattern required `alias` and then `required`, in that order. It
    // matched all 144 maps in the catalog because that is the order the
    // compiler happens to emit today — and a map with `isSignal` between them,
    // or `alias` last as here, reported a REQUIRED input as optional and an
    // aliased one under a name no template binds. Both halves of that are the
    // kind of wrong answer an agent writes code against.
    expect(text.required).toBe(true);
    expect(text.alias).toBe('wrTooltip');
  });

  it('reports nothing as required when the file carries no ɵcmp map', () => {
    // Directives compiled elsewhere, and plain classes, have no input map at
    // all. Absent must read as "not required", never as "required".
    expect(extractClass(DETACHED, 'WrLoner')?.members).toEqual([
      {
        name: 'type',
        kind: 'input',
        type: 'WrAlertType',
        description: '',
        default: null,
        required: false,
        alias: null,
      },
    ]);
  });

  it('sorts each member into the kind a template sees', () => {
    const kinds = Object.fromEntries(selectMembers().map(member => [member.name, member.kind]));

    expect(kinds).toEqual({
      options: 'input',
      placeholder: 'input',
      ariaLabel: 'input',
      // `InputSignalWithTransform` is still an input — that is how every
      // boolean-attribute input in this library is emitted.
      disabled: 'input',
      labels: 'input',
      value: 'model',
      opened: 'output',
      // No signal wrapper and no parameter list: a plain readonly property.
      trigger: 'property',
      // A method's name carries its signature — see the naming case below.
      'focus()': 'method',
      'open(index?: number)': 'method',
    });
  });

  it('unwraps the signal wrapper so a type reads as what a template binds', () => {
    const members = selectMembers();

    // `InputSignal<T>` is the container, not the contract.
    expect(memberOf(members, 'value').type).toBe('T | null');
    expect(memberOf(members, 'opened').type).toBe('void');
    // The transform's second argument is the accepted input, not the value —
    // `[disabled]="true"` binds a boolean.
    expect(memberOf(members, 'disabled').type).toBe('boolean');
    // A comma inside a nested generic is not an argument separator.
    expect(memberOf(members, 'labels').type).toBe('Record<string, readonly string[]>');
    // Unwrapped types keep their shape.
    expect(memberOf(members, 'trigger').type).toBe('_angular_core.ElementRef<HTMLElement> | null');
  });

  it('takes @default from a member doc', () => {
    const members = selectMembers();

    // The default is the difference between "you must pass this" and "leave it
    // alone", so it is worth its own tag rather than a sentence in the prose.
    expect(memberOf(members, 'placeholder').default).toBe('null');
    expect(memberOf(members, 'disabled').default).toBe('false');
    expect(memberOf(members, 'options').default).toBeNull();
  });

  it('keeps each member description and stops it at its own tags', () => {
    const members = selectMembers();

    expect(memberOf(members, 'placeholder').description).toBe('Placeholder shown while nothing is chosen.');
    expect(memberOf(members, 'focus()').description).toBe('Move focus to the trigger.');
  });

  it('excludes protected, private and compiler-generated members', () => {
    const names = selectMembers().map(member => member.name);

    // `resolvedSize` is in the declarations because TypeScript emits it, not
    // because anyone may bind it — listing it sends an agent into internals the
    // library renames without notice. It is deliberately declared in the
    // fixture as an `InputSignal`, the shape most likely to be mistaken for
    // API, so this stays a test of the ACCESS MODIFIER and not of the type.
    // `ɵfac` / `ɵcmp` are not API at all.
    expect(names).not.toContain('resolvedSize');
    expect(names).not.toContain('overlay');
    expect(names.filter(name => name.startsWith('ɵ'))).toEqual([]);
    // Nor may they arrive under some other kind: the whole list is public.
    expect(names).toEqual([
      'options',
      'placeholder',
      'ariaLabel',
      'disabled',
      'labels',
      'value',
      'opened',
      'trigger',
      'focus()',
      'open(index?: number)',
    ]);
  });

  it('hides a member the library marks @internal, and only on the tag', () => {
    const names = (extractClass(INTERNAL, 'WrIconRegistry')?.members ?? []).map(member => member.name);

    // Nine class members ship `@internal` — `public` only because TypeScript
    // needed them to be — and they are not for a consumer to call. It has to be
    // read as a TAG: as a line match it also matched the word inside an
    // `@example` body, which DELETED the public member that example was
    // documenting. Silently, and from the answer an agent trusts most.
    expect(names).toEqual(['register(icons: Record<string, string>)']);
    expect(names).not.toContain('store()');
  });

  it('reads a class whose declarations were cut off, without members', () => {
    const found = extractClass(
      '/** Half a file. */\ndeclare class WrTruncated {\n    readonly a: string;',
      'WrTruncated'
    );

    // A truncated `.d.ts` is a broken install, and the useful answer is the
    // class with an empty surface rather than an exception in the client.
    expect(found).toEqual({
      name: 'WrTruncated',
      description: 'Half a file.',
      example: null,
      docs: null,
      members: [],
    });
  });

  it('takes the class body and not a constraint in its type parameters', () => {
    const found = extractClass(GENERIC, 'WrGrid');

    // The opening brace is the one at angle-depth zero. Taking the FIRST `{`
    // after the class name made `<T extends { id: string }>` the body: the
    // component answered with one fabricated member, `id: string`, and its real
    // API — every input, every method — was gone. An agent reading that is not
    // missing information, it has been told something false.
    expect(found?.members.map(member => member.name)).toEqual(['items', 'scrollToRow(index: number)']);
    expect(memberOf(found?.members ?? [], 'items')).toMatchObject({ type: 'readonly T[]', required: true });
  });

  it('reads past a comment inside a declaration, apostrophe and all', () => {
    const members = extractClass(NESTED, 'WrPoller')?.members ?? [];

    // A comment is not code. The apostrophe in `don't`, nested inside the
    // declaration rather than above it, opened a string that never closed — so
    // no `;` was ever found at depth zero, the rest of the class became ONE
    // member with a 241,013-character "type", and everything after it
    // disappeared. The pre-rewrite failure mode arriving through another door.
    expect(members.map(member => member.name)).toEqual(['config', 'stop()']);
    expect(memberOf(members, 'stop()').type).toBe('void');
  });

  it('never reports a type with a comment left in it', () => {
    // Cosmetic next to losing the member, but it is the string an agent copies
    // into a signature: a nested doc comment inside an object type has no place
    // in the type it documents.
    expect(memberOf(extractClass(NESTED, 'WrPoller')?.members ?? [], 'config').type).toBe('{ delay: number; }');
  });

  it('keeps a string-literal type whole through its own punctuation', () => {
    const members = extractClass(LITERAL, 'WrBreadcrumbs')?.members ?? [];

    // The characters this reader counts — `>` to close the wrapper, `,` to split
    // its arguments — are characters a string-literal type is allowed to
    // CONTAIN. Counted inside the quotes, the `>` ended the wrapper early and
    // the `,` split the union: `InputSignal<', ' | ' | '>` reported a type of
    // `'`, one apostrophe, for the input that decides what the component draws.
    expect(memberOf(members, 'separator').type).toBe("'/' | '>' | ', '");
    expect(memberOf(members, 'joiner').type).toBe("', ' | ' | '");
  });

  it('reports a get/set pair as one property, and reads through accessor', () => {
    const members = extractClass(ACCESSORS, 'WrTour')?.members ?? [];

    // Two shapes, one answer each. The pair used to come back as TWO members of
    // the same name, the setter's typed `unknown` — so the same property was
    // documented twice, contradicting itself. And `accessor label: string` came
    // out named `accessor`, with the real name lost, because the keyword was not
    // in the modifier set.
    expect(members.map(member => member.name)).toEqual(['index', 'label']);
    expect(memberOf(members, 'index')).toMatchObject({ kind: 'property', type: 'number' });
    expect(memberOf(members, 'label')).toMatchObject({ kind: 'property', type: 'string' });
  });

  it('does not fold a base class into the class that extends it', () => {
    // Documented limitation rather than a defect: the reader answers for one
    // declaration. It matters only for the harness bases and the date
    // adapters, none of which have bindable inputs of their own.
    expect(extractClass(INHERITED, 'WrBarChart')?.members.map(member => member.name)).toEqual(['color']);
    expect(extractClass(INHERITED, 'WrChartBase')?.members.map(member => member.name)).toEqual(['data']);
  });

  it('names a method with the signature a caller has to write', () => {
    const names = dialogMembers().map(member => member.name);

    // A bare `open` says nothing about what to pass, and not having to open the
    // 60 KB `.d.ts` is the whole point of the tool. Both of these also used to
    // end the scan early: three type parameters, and a callback parameter whose
    // `)` closes before the parameter list does.
    expect(names).toContain(
      'open<C, R = unknown, D = unknown>(component: ComponentType<C>, options?: WrDialogOptions<D>)'
    );
    expect(names).toContain(
      'bind(spec: WrHotkeySpec, handler: (event: KeyboardEvent) => void, options?: WrHotkeyOptions)'
    );
  });

  it('finds the public members that follow ones it cannot classify', () => {
    const names = dialogMembers().map(member => member.name);

    // The reader this replaced matched an optional JSDoc prefix that was lazy
    // but expandable, so anything it could not read — the two untyped `private
    // readonly` fields and the constructor above `get top` — let the match grow
    // to the NEXT comment and swallow every public member in between. Sixty-
    // seven were missing across the catalog, `WrDialog.open` among them.
    expect(names).toHaveLength(3);
    // Skipped, not swallowed: the unreadable ones are still not API.
    expect(names).not.toContain('overlay');
    expect(names).not.toContain('parentInjector');
  });

  it('never lists a constructor as a member', () => {
    // Nobody `new`s an Angular class — the framework does — and 92 constructors
    // used to be listed as methods returning `unknown`.
    expect(dialogMembers().some(member => member.name.startsWith('constructor'))).toBe(false);
  });

  it('reports a getter as a property, under the name it is read by', () => {
    // Both halves matter. `get top()` is read as `dialog.top`, so filing it
    // under methods sends an agent to call it — and for a while it was ALSO
    // named `top()`, the accessor's own empty parameter list surviving into the
    // name, which invited the call the `property` kind exists to prevent.
    const top = memberOf(dialogMembers(), 'top');

    expect(top.kind).toBe('property');
    expect(top.type).toBe('WrDialogRef<unknown> | null');
    expect(dialogMembers().some(member => member.name === 'top()')).toBe(false);
  });

  it('never files the source around a member as its description', () => {
    // The swallowed-member defect showed up as prose: `WrTable.scrollToRow`
    // came back with a 5806-character "description" naming 42 internals, and
    // 66 members leaked a `protected` or `private` declaration into their own.
    expect(dialogMembers().map(member => member.description)).toEqual([
      'The dialog on top, if any.',
      'Open a component in a dialog.',
      'Run a handler while a key combination is held.',
    ]);
  });

  it('finds an abstract member and reads it as the kind it is', () => {
    // `abstract` is how the date adapters and the harness bases are written, so
    // a reader that skips the modifier answers with an empty surface for them.
    expect(memberOf(tableMembers(), 'rows()')).toMatchObject({ kind: 'method', type: 'readonly T[]' });
  });

  it('unwraps the wrapper under the i0 alias as well as _angular_core', () => {
    // 25 of the 167 shipped declaration files import Angular as `i0`. Matching
    // only the other alias hid every binding in them — including `WrIcon`,
    // whose single required input is the entire component.
    expect(memberOf(tableMembers(), 'rowKey').kind).toBe('input');
    expect(memberOf(tableMembers(), 'loading')).toMatchObject({ kind: 'input', type: 'boolean' });
  });

  it('keeps an arrow inside a type whole', () => {
    // The `>` of `=>` is not a closing angle bracket. Reading it as one cut nine
    // binding types short — `string | ((row: T` — into TypeScript that does not
    // parse, handed to an agent as the signature to write against.
    expect(memberOf(tableMembers(), 'rowKey').type).toBe('string | ((row: T) => unknown) | null');
  });

  it('splits a tag written inline out of the description', () => {
    const loading = memberOf(tableMembers(), 'loading');

    // JSDoc allows `/** Show the loading overlay. @default false */` on one
    // line, and `wr-table`'s own `loading` is written that way: the reader that
    // only looked for a tag at the start of a line left `@default false` inside
    // the prose an agent reads and reported no default at all.
    expect(loading.description).toBe('Show the loading overlay.');
    expect(loading.default).toBe('false');
  });

  it('captures a tag body that begins on the next line, in full', () => {
    const found = extractClass(SELECT, 'WrSelect');

    // This case used to pin the opposite. `tagOf` built its terminator with the
    // `m` flag, so the `$` in it matched the end of the FIRST LINE: `@see`,
    // whose body sits on the tag's own line, survived, and `@example` — which
    // every component in this library writes as a block starting on the next
    // one — came back empty and was dropped to `null`. 273 of the 276 classes
    // in `dist/lib/types` have an `@example` and 3 came out, which made the
    // `## Example` section of `get_ngwr_api` dead code nobody noticed.
    expect(found?.example).toBe('<wr-select [options]="options" [(value)]="value" />');

    const inline = extractClass('/**\n * A class.\n *\n * @example <wr-x />\n */\ndeclare class WrX {\n}', 'WrX');
    expect(inline?.example).toBe('<wr-x />');
  });

  it('runs a multi-line tag body to the next tag and no further', () => {
    const found = extractClass(
      [
        '/**',
        ' * A class.',
        ' *',
        ' * @example',
        ' * <wr-x>',
        ' *   <wr-y />',
        ' * </wr-x>',
        ' *',
        ' * @see https://ngwr.dev/reference/components/x',
        ' */',
        'declare class WrX {',
        '}',
      ].join('\n'),
      'WrX'
    );

    // The two halves of the same contract: an example keeps its own indentation
    // across every line it runs to, and stops at the tag after it rather than
    // absorbing the `@see` an agent is meant to follow.
    expect(found?.example).toBe('<wr-x>\n  <wr-y />\n</wr-x>');
    expect(found?.docs).toBe('https://ngwr.dev/reference/components/x');
  });

  it('runs an example through a code fence that contains Angular block syntax', () => {
    const found = extractClass(
      [
        '/**',
        ' * A class.',
        ' *',
        ' * @example',
        ' * ```html',
        ' * @for (row of rows(); track row.id) {',
        ' *   <wr-x [row]="row" />',
        ' * }',
        ' * ```',
        ' *',
        ' * @see https://ngwr.dev/reference/components/x',
        ' */',
        'declare class WrX {',
        '}',
      ].join('\n'),
      'WrX'
    );

    // Nothing inside a fence is a tag. The terminator used to be any line
    // matching `^@\\w+`, which in a library that DOCUMENTS ANGULAR TEMPLATES
    // ends a body on `@for` / `@if` / `@defer` — the example cut at the fence it
    // had just opened, leaving an unterminated ```html for an agent to paste.
    expect(found?.example).toBe(
      ['```html', '@for (row of rows(); track row.id) {', '  <wr-x [row]="row" />', '}', '```'].join('\n')
    );
    // And the tag after the fence still closes the block, as before.
    expect(found?.docs).toBe('https://ngwr.dev/reference/components/x');
  });

  it('does not let an unknown @word end a tag body', () => {
    const found = extractClass(
      [
        '/**',
        ' * A class.',
        ' *',
        ' * @example',
        ' * <wr-x />',
        ' * @ViewChild(WrX) x!: WrX;',
        ' * onClick(): void { this.x.next(); }',
        ' *',
        ' * @see https://ngwr.dev/reference/components/x',
        ' */',
        'declare class WrX {',
        '}',
      ].join('\n'),
      'WrX'
    );

    // The other half of the same fix, and the one a fence does not cover: only a
    // KNOWN tag opens a block, so a decorator at the start of an unfenced line
    // is prose. `@ViewChild` is how every one of this library's imperative
    // examples reaches the component — reading it as a tag threw the rest of the
    // example away and invented a `ViewChild` tag nothing asks for.
    expect(found?.example).toBe(
      ['<wr-x />', '@ViewChild(WrX) x!: WrX;', 'onClick(): void { this.x.next(); }'].join('\n')
    );
    expect(found?.docs).toBe('https://ngwr.dev/reference/components/x');
  });
});

/**
 * The same two contracts, against doc comments the library really carries.
 *
 * The synthetic fixtures above say what the reader must do; these say that the
 * library it reads is full of the shape in question. They used to read
 * `dist/lib/types/*.d.ts` and skip when it was absent, which was never once
 * satisfied on CI — the suite runs before `build:lib` — so two tests read as
 * coverage while never executing. The class doc comment is what ng-packagr
 * copies into the declaration verbatim, and it is on disk in every checkout, so
 * the same two examples go through the same parser with nothing to skip.
 */
/**
 * The workspace root, found by walking UP from the process's working directory.
 *
 * Deliberately NOT derived from `import.meta.url`. The Angular unit-test builder
 * BUNDLES specs, so that URL names a location inside the bundle rather than this
 * file, and `resolve(HERE, '..', '..', '..')` therefore landed on the repo root
 * on a developer's machine and on `/home/runner` in CI, where the checkout sits
 * one directory deeper. The suite then shelled out to a `tsc` that did not exist
 * and pointed `-p` at the ROOT tsconfig instead of the MCP one — green locally,
 * red only on the machine nobody watches.
 *
 * Anchoring on two files only the workspace root carries, and throwing when
 * neither is above the runner's cwd, keeps this honest wherever it starts.
 */
function workspaceRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'angular.json'))) return dir;
    const up = dirname(dir);
    if (up === dir) {
      throw new Error(`no workspace root above ${process.cwd()} — looked for pnpm-workspace.yaml beside angular.json`);
    }
    dir = up;
  }
}

const LIB = resolve(workspaceRoot(), 'projects', 'lib');

/** A class's own doc comment, wrapped as the one-class declaration `extractClass` reads. */
const documented = (file: string, symbol: string): string => {
  const source = readFileSync(resolve(LIB, file), 'utf8');
  const declaration = source.indexOf(`export class ${symbol}`);
  // Loudly, rather than as an empty example that would pass every assertion
  // below: a moved file must fail this suite, not quietly empty it.
  if (declaration === -1) throw new Error(`${symbol} is no longer declared in ${file}.`);

  // The last block comment before the declaration — the decorator in between
  // carries none of its own.
  const start = source.lastIndexOf('/**', declaration);
  const end = source.indexOf('*/', start) + 2;

  return `${source.slice(start, end)}\ndeclare class ${symbol} {\n}\n`;
};

describe("the library's own examples", () => {
  it('keeps the example a fenced @for used to cut in half', () => {
    const example = extractClass(documented('pipes/range.ts', 'WrRange'), 'WrRange')?.example ?? '';

    // `WrRange`'s example is four lines of `@for` inside an ```html fence, and
    // what the tool returned for it was the fence and nothing else — one line,
    // unterminated, of an example whose entire content is the block syntax.
    expect(example.split('\n')).toHaveLength(5);
    expect(example.startsWith('```html')).toBe(true);
    expect(example).toContain('@for (i of (5 | wrRange); track i)');
    expect(example.endsWith('```')).toBe(true);
  });

  it('keeps the lines an @ViewChild used to cut off an example', () => {
    const example =
      extractClass(documented('rotating-text/rotating-text.ts', 'WrRotatingText'), 'WrRotatingText')?.example ?? '';

    // `WrRotatingText`'s example demonstrates the imperative half of its API,
    // and the demonstration is exactly the part that was lost: everything from
    // the `@ViewChild` line on, which is the only place the docs show how to
    // reach `next()`. What came back stopped at the comment introducing it — an
    // unterminated fence whose last line reads `// Manual control:`.
    expect(example).toContain('@ViewChild(WrRotatingText)');
    expect(example).toContain('this.rotator.next()');
    expect(example.endsWith('```')).toBe(true);
  });
});
