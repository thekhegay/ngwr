/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { execFileSync, spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The server, over real stdio.
 *
 * Everything here goes through a spawned `node server.js` and newline-delimited
 * JSON on its stdin, because that is the only interface a client has. Calling
 * `handle()` in-process would test the switch statement and skip the two things
 * that actually break a stdio server: framing (a message that arrives in two
 * chunks, a notification that must produce no bytes at all) and stream purity
 * (one stray `console.log` and every client drops the connection).
 *
 * It runs against a COMPILED artifact rather than the source, because the
 * compiled artifact is what `npx ngwr-mcp` runs — shebang, execute bit and all.
 * The artifact is built HERE, into a temp package laid out like an installed
 * `ngwr`, with the same `tsc -p mcp/tsconfig.json` invocation and the same two
 * finishing touches `scripts/build-mcp.ts` applies.
 *
 * It used to point at `dist/lib/mcp/server.js` and skip when that was missing,
 * which read as coverage and was not: CI runs the suite twenty-one lines BEFORE
 * `build:lib`, so on a fresh checkout every test in this file skipped and the
 * job went green — a stray `console.log` in `server.ts`, the one thing this file
 * exists to catch, would have shipped. Compiling costs about a second and
 * answers on any checkout.
 *
 * The catalog underneath it is a fixture for the same reason `tools.spec.ts`
 * gives: the answer to "what does `wr-select` take" is a fixed string here,
 * where against the real generated catalog it changes every time someone adds
 * an input.
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

const ROOT = workspaceRoot();
const TSC = resolve(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const TSCONFIG = resolve(ROOT, 'projects', 'lib', 'mcp', 'tsconfig.json');

/**
 * The fixture package's own version.
 *
 * Deliberately a string nothing else in the run could produce. Against the real
 * `dist/lib/package.json` the package version and the invoking project's version
 * are the same file, which is precisely why reading `npm_package_version` looked
 * correct for as long as it did.
 */
const PACKAGE_VERSION = '9.9.9-fixture';

/**
 * The catalog the fixture answers from, in `gen-ai-assets.ts`'s own format.
 *
 * Three entry points, chosen for what the wire tests ask of them: `select` for a
 * class with a full API surface, `table` for the biggest answer the server has,
 * and `markdown` so a query that is not an entry-point name still has something
 * to hit.
 */
const CATALOG = [
  '# ngwr — full reference',
  '',
  '> Generated from the library source: every entry point with its import path,',
  '> selector(s), public exports, and description. Concise quick-ref: /llms.txt',
  '',
  '## ngwr/markdown',
  "- import: `import { WrMarkdown } from 'ngwr/markdown'`",
  '- selector: `wr-markdown`',
  '- exports: WrMarkdown',
  '- Renders markdown as DOM, never as HTML — raw HTML in the source is escaped.',
  '',
  '## ngwr/select',
  "- import: `import { WrSelect } from 'ngwr/select'`",
  '- selector: `wr-select`',
  '- exports: WrSelect, WrSelectOption',
  '- Dropdown select — single, multi, search and tag modes in one component.',
  '',
  '## ngwr/table',
  "- import: `import { WrTable } from 'ngwr/table'`",
  '- selector: `wr-table`',
  '- exports: WrTable, WrTableColumn',
  '- The data workhorse — pinning, resizing, selection, grouping and tree rows.',
  '',
].join('\n');

const SYMBOL_MAP = {
  WrMarkdown: 'ngwr/markdown',
  WrSelect: 'ngwr/select',
  WrTable: 'ngwr/table',
};

/** The package's own `exports` map — where `hasStyles` gets its answer. */
const EXPORTS = {
  './markdown': { sass: './markdown/styles/_index.scss' },
  './select': { sass: './select/styles/_index.scss' },
  './table': { sass: './table/styles/_index.scss' },
};

/** `ngwr/select`, in emitted-`.d.ts` shape — the `ɵcmp` map included, since that is where required-ness lives. */
const SELECT_TYPES = `
import * as _angular_core from '@angular/core';

interface WrSelectOption<T> {
    label: string;
    value: T;
}

/**
 * Dropdown select — single, multi, search and tag modes in one component.
 *
 * @see https://ngwr.dev/reference/components/select
 */
declare class WrSelect<T> {
    /** Options the panel renders. */
    readonly options: _angular_core.InputSignal<readonly T[]>;
    /** Placeholder shown while nothing is chosen. */
    readonly placeholder: _angular_core.InputSignal<string | null>;
    /** The chosen value. */
    readonly value: _angular_core.ModelSignal<T | null>;
    /** Emitted when the panel opens. */
    readonly opened: _angular_core.OutputEmitterRef<void>;
    /** Move focus to the trigger. */
    focus(): void;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<WrSelect<any>, "wr-select", never, { "options": { "alias": "options"; "required": true; "isSignal": true; }; "placeholder": { "alias": "placeholder"; "required": false; "isSignal": true; }; "value": { "alias": "value"; "required": false; "isSignal": true; }; }, { "value": "valueChange"; "opened": "opened"; }, never, never, true, never>;
}

export { WrSelect };
export type { WrSelectOption };
`;

/**
 * `ngwr/table`'s declarations, at the size the real ones are.
 *
 * Sixty generated inputs rather than a hand-copied list: what the two batch
 * tests pin is a reply array of some megabytes leaving in one
 * `JSON.stringify`, so the property that has to hold is the ORDER OF MAGNITUDE
 * of a single answer — about 8 KB here against the shipped table's 9.7 KB. A
 * three-input fixture would have let both of them pass on a reply far too small
 * to prove anything.
 */
const TABLE_TYPES = [
  "import * as _angular_core from '@angular/core';",
  '',
  'interface WrTableColumn {',
  '    key: string;',
  '    label: string;',
  '}',
  '',
  '/**',
  ' * The data workhorse — pinning, resizing, selection, grouping and tree rows.',
  ' *',
  ' * @see https://ngwr.dev/reference/components/table',
  ' */',
  'declare class WrTable<T> {',
  ...Array.from({ length: 60 }, (_, index) => [
    `    /** Binding ${index}: one of the many switches the table carries, documented the way ng-packagr emits it. */`,
    `    readonly binding${index}: _angular_core.InputSignal<readonly WrTableColumn[] | null>;`,
  ]).flat(),
  '}',
  '',
  'export { WrTable };',
  'export type { WrTableColumn };',
].join('\n');

/** The temp package, and the compiled server inside it. */
let root: string;
let server: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'ngwr-mcp-server-'));
  server = join(root, 'mcp', 'server.js');

  // The compiler invocation `scripts/build-mcp.ts` runs, pointed at the fixture
  // instead of `dist/lib`. Failing loudly here is the whole point of the change:
  // a compiler that cannot be found must not read as a suite with nothing to do.
  execFileSync(process.execPath, [TSC, '-p', TSCONFIG, '--outDir', join(root, 'mcp')], { stdio: 'pipe' });
  // A `bin` has to name its interpreter and be executable, and tsc emits
  // neither, so `build-mcp.ts` adds both after compiling. What ships is what
  // should be under test.
  writeFileSync(server, `#!/usr/bin/env node\n${readFileSync(server, 'utf8')}`);
  chmodSync(server, 0o755);

  // `Catalog` resolves its root as `dirname(dirname(server.js))`, so everything
  // the server reads sits one level up — the layout of an installed package.
  // `type: module` is not decoration: the emitted code is ESM, and without it
  // Node parses the first `import` as CommonJS and the process dies before a
  // byte reaches stdout. `dist/lib/package.json` declares it for that reason.
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'ngwr', version: PACKAGE_VERSION, type: 'module', exports: EXPORTS })
  );
  writeFileSync(join(root, 'llms-full.txt'), CATALOG);
  mkdirSync(join(root, 'schematics', 'use'), { recursive: true });
  writeFileSync(join(root, 'schematics', 'use', 'symbol-map.json'), JSON.stringify(SYMBOL_MAP, null, 2));
  mkdirSync(join(root, 'types'), { recursive: true });
  writeFileSync(join(root, 'types', 'ngwr-select.d.ts'), SELECT_TYPES);
  writeFileSync(join(root, 'types', 'ngwr-table.d.ts'), TABLE_TYPES);
  // No declarations for `markdown`: an entry point whose declarations are
  // missing has to answer, not throw.
}, 60_000);

afterAll(() => rmSync(root, { recursive: true, force: true }));

/** A JSON-RPC message as it comes back off stdout. */
interface RpcMessage {
  readonly jsonrpc?: string;
  readonly id?: string | number | null;
  readonly result?: Record<string, unknown>;
  readonly error?: { readonly code: number; readonly message: string };
}

interface Run {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** Every non-empty stdout line, parsed — `null` for a line that is not JSON. */
  readonly messages: readonly (RpcMessage | null)[];
}

interface Session {
  /** Write raw bytes to the server's stdin — not necessarily a whole message. */
  readonly write: (text: string) => void;
  /** Close stdin and resolve once the process has exited. */
  readonly done: () => Promise<Run>;
}

/** A running server, with stdin still open. */
const start = (env: NodeJS.ProcessEnv = process.env): Session => {
  const child = spawn(process.execPath, [server], { env });
  let stdout = '';
  let stderr = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  return {
    write: text => {
      child.stdin.write(text);
    },
    done: () =>
      new Promise<Run>(resolve => {
        child.stdin.end();
        child.on('close', code => {
          const messages = stdout
            .split('\n')
            .filter(line => line.length > 0)
            .map(line => {
              try {
                return JSON.parse(line) as RpcMessage;
              } catch {
                return null;
              }
            });

          resolve({ code, stdout, stderr, messages });
        });
      }),
  };
};

/** Send whole lines, close stdin, collect what came back. */
const run = async (lines: readonly string[], env?: NodeJS.ProcessEnv): Promise<Run> => {
  const session = start(env);
  for (const line of lines) session.write(`${line}\n`);

  return session.done();
};

const request = (id: number | string, method: string, params?: Record<string, unknown>): string =>
  JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });

/** One line carrying `count` requests as a JSON-RPC batch, ids 1…count. */
const batch = (count: number, method: string, params?: Record<string, unknown>): string =>
  `[${Array.from({ length: count }, (_, index) => request(index + 1, method, params)).join(',')}]`;

/** The batch reply on one line, which arrives as a JSON array rather than a message. */
const batchReply = (result: Run, line = 0): readonly RpcMessage[] => {
  const lines = result.stdout.trimEnd().split('\n').filter(Boolean);
  const raw = lines[line];
  if (raw === undefined) throw new Error(`no line ${line} on stdout. stdout was:\n${result.stdout || '<empty>'}`);

  return JSON.parse(raw) as readonly RpcMessage[];
};

/** The reply to one id, failing by name when it never came. */
const replyTo = (result: Run, id: number | string): RpcMessage => {
  const found = result.messages.find(message => message?.id === id);
  if (!found) throw new Error(`no reply for id ${id}. stdout was:\n${result.stdout || '<empty>'}`);

  return found;
};

/** An environment with the version variable under the test's control. */
const withVersion = (version?: string): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  if (version === undefined) delete env['npm_package_version'];
  else env['npm_package_version'] = version;

  return env;
};

describe('ngwr-mcp over stdio', () => {
  it('echoes back a protocol version it speaks', async () => {
    const result = await run([request(1, 'initialize', { protocolVersion: '2024-11-05' })]);

    // An older client is not told to upgrade for a server that would have
    // worked: the answer is the version it asked for.
    expect(replyTo(result, 1).result?.['protocolVersion']).toBe('2024-11-05');
  });

  it('offers its newest version when the client asks for one it does not know', async () => {
    const result = await run([request(1, 'initialize', { protocolVersion: '1999-01-01' }), request(2, 'initialize')]);

    // Both the unknown version and the missing one fall back to the newest the
    // server speaks, which is what the client then has to agree to.
    expect(replyTo(result, 1).result?.['protocolVersion']).toBe('2025-06-18');
    expect(replyTo(result, 2).result?.['protocolVersion']).toBe('2025-06-18');
  });

  it('announces a tools capability and names itself', async () => {
    const result = await run([request(1, 'initialize', { protocolVersion: '2025-06-18' })]);
    const body = replyTo(result, 1).result;

    // A client that sees no `tools` capability never calls `tools/list`.
    expect(body?.['capabilities']).toEqual({ tools: {} });
    expect(body?.['serverInfo']).toMatchObject({ name: 'ngwr', title: 'ngwr component catalog' });
    expect(String(body?.['instructions'])).toContain('search_ngwr');
  });

  it('reports the version of the package it is part of, not the environment', async () => {
    const poisoned = await run([request(1, 'initialize')], withVersion('11.0.0-test'));
    const bare = await run([request(1, 'initialize')], withVersion());

    // It used to read `npm_package_version`, which npx sets from the project that
    // INVOKED the server — so a consumer app had its own version reported back as
    // the catalog's. Installing the tarball into a scratch package is what showed
    // it: against `dist/` the two are the same file, which is why the fixture's
    // version is one nothing in the environment could supply. Both runs must
    // answer the package's own version, including the one whose environment says
    // otherwise.
    expect(replyTo(poisoned, 1).result?.['serverInfo']).toMatchObject({ version: PACKAGE_VERSION });
    expect(replyTo(bare, 1).result?.['serverInfo']).toMatchObject({ version: PACKAGE_VERSION });
  });

  it('lists the four tools with the schemas a client validates against', async () => {
    const result = await run([request(1, 'tools/list')]);
    const tools = replyTo(result, 1).result?.['tools'] as { name: string; inputSchema: { type: string } }[];

    expect(tools.map(tool => tool.name)).toEqual([
      'search_ngwr',
      'get_ngwr_component',
      'get_ngwr_api',
      'get_ngwr_setup',
    ]);
    expect(tools.every(tool => tool.inputSchema.type === 'object')).toBe(true);
  });

  it('answers a tools/call with text content', async () => {
    const result = await run([
      request(1, 'tools/call', { name: 'get_ngwr_setup', arguments: { symbols: [] } }),
      request(2, 'tools/call', { name: 'search_ngwr', arguments: { query: 'select' } }),
    ]);

    // The first answer does not touch the catalog, so it is the same string on
    // any install; the second one does, so it is only asserted to be an answer.
    expect(replyTo(result, 1).result).toEqual({
      content: [{ type: 'text', text: 'Name at least one symbol, e.g. ["WrSelect"].' }],
    });
    const content = replyTo(result, 2).result?.['content'] as { type: string; text: string }[];
    expect(content[0].type).toBe('text');
    expect(content[0].text.length).toBeGreaterThan(0);
  });

  it('refuses a tools/call with no tool name', async () => {
    const result = await run([request(1, 'tools/call', { arguments: {} })]);

    // Invalid params, not "unknown tool": the client sent a malformed call.
    expect(replyTo(result, 1).error).toEqual({ code: -32602, message: 'tools/call needs a tool name.' });
  });

  it('answers an argument that names a property of Object.prototype as an ordinary miss', async () => {
    const result = await run([
      request(1, 'tools/call', { name: 'get_ngwr_component', arguments: { name: 'toString' } }),
      request(2, 'ping'),
    ]);
    const reply = replyTo(result, 1);

    // This case used to assert an `isError` result here, because `toString` hit
    // the symbol-map defect characterised in catalog.spec and was the only input
    // that reliably threw — so it doubled as the proof that a throwing tool is
    // contained. The map is a null-prototype object now, so the same call is
    // just a miss, and this asserts the whole chain end to end: a successful
    // call, the honest answer in it, and a server still listening on the `ping`.
    // Nothing reachable from the wire throws any more, which leaves the
    // `isError` branch in `tools/call` as belt and braces rather than a path a
    // client can provoke.
    expect(reply.error).toBeUndefined();
    expect(reply.result?.['isError']).toBeUndefined();
    expect(String((reply.result?.['content'] as { text: string }[])[0].text)).toContain(
      'No ngwr entry point matches "toString"'
    );
    expect(replyTo(result, 2).result).toEqual({});
  });

  it('refuses an unknown tool name with -32602 and names the ones it has', async () => {
    const result = await run([request(1, 'tools/call', { name: 'get_ngwr_docs', arguments: {} }), request(2, 'ping')]);

    // Returned as a SUCCESSFUL call — which is what it used to be — the sentence
    // "Unknown tool: get_ngwr_docs" reads to an agent like the answer to its
    // question, and an agent that cannot tell a refusal from an answer retries
    // the same call. A protocol error is the only thing a client checks.
    expect(replyTo(result, 1).error).toEqual({
      code: -32602,
      message: 'Unknown tool: get_ngwr_docs. Available: search_ngwr, get_ngwr_component, get_ngwr_api, get_ngwr_setup.',
    });
    // A refusal is not a fatal one.
    expect(replyTo(result, 2).result).toEqual({});
  });

  it('refuses an argument the published schema forbids with -32602, naming it', async () => {
    const result = await run([
      request(1, 'tools/call', { name: 'get_ngwr_setup', arguments: { symbols: 'WrSelect' } }),
      request(2, 'tools/call', { name: 'search_ngwr', arguments: {} }),
    ]);

    // `tools/list` publishes `symbols` as an array of strings and `query` as
    // required; honouring that is what stops a wrong shape reaching the tool
    // body, where `symbols.map is not a function` came back as the answer. The
    // message names the argument, because that is the only part the client can
    // fix.
    expect(replyTo(result, 1).error).toEqual({
      code: -32602,
      message: 'get_ngwr_setup: `symbols` must be an array.',
    });
    expect(replyTo(result, 2).error).toEqual({ code: -32602, message: 'search_ngwr: `query` is required.' });
  });

  it('refuses a kind the published enum does not list, naming the ones it does', async () => {
    const result = await run([
      request(1, 'tools/call', { name: 'get_ngwr_api', arguments: { symbol: 'WrSelect', kind: 'Input' } }),
      request(2, 'tools/call', { name: 'get_ngwr_api', arguments: { symbol: 'WrSelect', kind: 'input' } }),
    ]);

    // `enum` was published at `tools/list` and then not checked, and it failed
    // in the worst shape available: `kind: "Input"` — one capital letter — came
    // back a SUCCESSFUL reply with ZERO member lines in it, which an agent
    // cannot tell apart from a component that has no inputs. It gets the wrong
    // answer and no reason to ask again. An error names the fix.
    expect(replyTo(result, 1).error).toEqual({
      code: -32602,
      message: 'get_ngwr_api: `kind` must be one of all, input, model, output, method, property.',
    });
    // The value the enum does list still answers, so this is a check and not a
    // wall in front of the argument.
    expect(replyTo(result, 2).error).toBeUndefined();
    expect(String((replyTo(result, 2).result?.['content'] as { text: string }[])[0].text)).toContain('## inputs');
  });

  it('answers a ping with an empty result', async () => {
    expect(replyTo(await run([request(7, 'ping')]), 7).result).toEqual({});
  });

  it('rejects an unknown method with -32601 and names it', async () => {
    const result = await run([request(1, 'resources/list')]);

    expect(replyTo(result, 1).error).toEqual({ code: -32601, message: 'Unknown method: resources/list' });
  });

  it('answers malformed JSON with a parse error against a null id', async () => {
    const result = await run(['{ this is not json', request(2, 'ping')]);

    // There is no id to answer against, and the spec's answer for that is a
    // null one. Dropping the line silently would leave a client waiting.
    expect(result.messages[0]).toEqual({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    // The stream is not poisoned by it either.
    expect(replyTo(result, 2).result).toEqual({});
  });

  it('says nothing at all to a notification', async () => {
    const result = await run([
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } }),
      request(3, 'ping'),
    ]);

    // Every client sends `notifications/initialized` right after `initialize`,
    // and a reply to a message with no id is a protocol violation — clients
    // that check will close the connection. The ping is the only thing on the
    // wire, and it is FIRST, which is what proves nothing was written before it.
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ id: 3 });
  });

  it('refuses an empty batch rather than answering nothing', async () => {
    // `[]` has no id to answer against, so silence would be indistinguishable to
    // the client from a server that hung. JSON-RPC §6 forbids it either way.
    const result = await run([JSON.stringify([])]);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.error).toMatchObject({ code: -32600 });
  });

  it('writes nothing at all for a batch of notifications', async () => {
    // A notification carries no id and expects no answer — in a batch as much as
    // alone. Answering one is as wrong as dropping a request.
    const notifications = `[${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })},${JSON.stringify(
      { jsonrpc: '2.0', method: 'ping' }
    )}]`;
    const result = await run([notifications, request(9, 'ping')]);

    // Exactly one message: the ping that did carry an id.
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.id).toBe(9);
  });

  it('refuses a batch over the cap with one -32600 that names the limit', async () => {
    const result = await run([batch(257, 'ping'), request('after', 'ping')]);

    // Measured, not guessed: 58,000 entirely VALID entries in one 6.8 MB batch
    // made the single `JSON.stringify` of the reply array throw `RangeError:
    // Invalid string length`, which killed the process with zero bytes written
    // and none of the 58,000 ids answered — the one outcome this server is
    // written to avoid, reached by a client that did nothing wrong except ask
    // for too much at once. A named limit is something it can split and retry.
    expect(result.messages[0]).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'A batch may carry at most 256 requests.' },
    });
    // One refusal for the batch, not one per entry — and the session survives it.
    expect(result.messages).toHaveLength(2);
    expect(replyTo(result, 'after').result).toEqual({});
  });

  it('answers every request in a batch at the cap, as one batch', async () => {
    const result = await run([batch(256, 'ping')]);
    const answered = batchReply(result);

    // The cap is a limit on the batch, not a quietly smaller batch: 256 goes
    // through, every id in it is answered, and the whole reply arrives as ONE
    // array on ONE line — which is what a client blocked on 256 ids parses.
    expect(result.stdout.trimEnd().split('\n')).toHaveLength(1);
    expect(answered.map(message => message.id)).toEqual(Array.from({ length: 256 }, (_, index) => index + 1));
    expect(answered.every(message => message.error === undefined)).toBe(true);
    expect(result.code).toBe(0);
  });

  it('serialises a batch of the largest answers it has without losing one', async () => {
    const result = await run([batch(256, 'tools/call', { name: 'get_ngwr_api', arguments: { symbol: 'WrTable' } })]);
    const answered = batchReply(result);

    // `write()` now catches a `JSON.stringify` that throws and emits a -32603
    // instead of taking the process down, and this is as close as the wire can
    // get to provoking it: 256 of the biggest answers this server has, in one
    // reply array of some megabytes. The guard itself is no longer reachable
    // from outside — every value that reaches `JSON.stringify` is a reply this
    // server built out of its own strings, so there is no cycle and no BigInt in
    // it, and the one input that DID push the string past V8's maximum length
    // was an unbounded batch, which `MAX_BATCH` refuses two lines earlier. What
    // is left to pin is the property the guard exists for: every id answered,
    // and a clean exit rather than zero bytes and a stack trace.
    expect(answered).toHaveLength(256);
    expect(answered.every(message => message.result !== undefined)).toBe(true);
    expect(result.stdout.length).toBeGreaterThan(1_000_000);
    expect(result.code).toBe(0);
  });

  it('handles a message that arrives in two chunks', async () => {
    const session = start();
    const line = request(1, 'initialize', { protocolVersion: '2024-11-05' });
    const cut = Math.floor(line.length / 2);

    session.write(line.slice(0, cut));
    // A separate tick, so the server really does see two `data` events — the
    // failure this guards against is a parser that assumes one message per
    // chunk, which works in every test until a big `tools/call` is split.
    await new Promise(resolve => setTimeout(resolve, 25));
    session.write(`${line.slice(cut)}\n`);

    const result = await session.done();
    expect(replyTo(result, 1).result?.['protocolVersion']).toBe('2024-11-05');
  });

  it('handles several messages arriving in one chunk', async () => {
    const session = start();

    // The other half of the framing contract: one write, three messages.
    session.write(`${request(1, 'ping')}\n${request(2, 'ping')}\n${request(3, 'ping')}\n`);

    const result = await session.done();
    expect(result.messages.map(message => message?.id)).toEqual([1, 2, 3]);
  });

  it('ignores blank lines between messages', async () => {
    const result = await run(['', '   ', request(1, 'ping'), '']);

    expect(result.messages).toHaveLength(1);
    expect(replyTo(result, 1).result).toEqual({});
  });

  // The only way to trip a 32 MB cap is to send 32 MB, and the server measures
  // the buffer on every chunk, so this one case costs about two seconds where
  // the rest of the file costs milliseconds — hence the raised timeout, and
  // hence it earning both halves of the fix in a single pass.
  it('measures the size cap in bytes, and answers the request behind an oversize line', async () => {
    const session = start();
    const cap = 32 * 1024 * 1024;
    // Three UTF-8 bytes and ONE UTF-16 unit each, which is the whole case: the
    // cap was checked with `String.length`, so 93 MB of characters like this
    // one walked past a 32 MB limit untouched. This fills the buffer to just
    // under the cap in units a third of the size.
    const wide = '猫';
    const under = Math.floor((cap - 6_000) / 3);
    const chunk = wide.repeat(1_000_000);

    let written = 0;
    for (; written + 1_000_000 <= under; written += 1_000_000) session.write(chunk);
    session.write(wide.repeat(under - written));
    // The chunk that takes the line OVER the cap also carries a complete, valid
    // request behind the newline. Clearing the whole buffer — which is what
    // tripping the cap used to do — discarded that request, and a request
    // discarded is a request answered with nothing, which no client recovers
    // from because none of them ever stops waiting.
    session.write(`${wide.repeat(4_000)}\n${request(1, 'ping')}\n`);

    const result = await session.done();

    expect(result.messages[0]).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Message exceeded the maximum size and was discarded.' },
    });
    expect(replyTo(result, 1).result).toEqual({});
    // Exactly those two: one refusal for the line, not one per chunk, and no
    // parse error for a fragment of it left in the buffer.
    expect(result.messages).toHaveLength(2);
  }, 30_000);

  it('writes nothing to stdout but protocol JSON, one message per line', async () => {
    const result = await run([
      request(1, 'initialize', { protocolVersion: '2025-06-18' }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      request(2, 'tools/list'),
      'not json at all',
      request(3, 'tools/call', { name: 'search_ngwr', arguments: { query: 'markdown' } }),
      request(4, 'ping'),
    ]);

    // The reason diagnostics go to stderr and the catalog is read lazily: one
    // banner on stdout and the client drops the connection.
    expect(result.messages.filter(message => message === null)).toEqual([]);
    expect(result.messages.every(message => message?.jsonrpc === '2.0')).toBe(true);
    expect(result.stdout.endsWith('\n')).toBe(true);
    // A tool answer is multi-line markdown; it must not arrive as multiple
    // lines on the wire.
    expect(result.stdout.trimEnd().split('\n')).toHaveLength(5);
  });

  it('exits cleanly when stdin closes', async () => {
    const result = await run([request(1, 'ping')]);

    // A client that closes the pipe expects the process to go away, not to
    // linger holding the terminal.
    expect(result.code).toBe(0);
  });
});
