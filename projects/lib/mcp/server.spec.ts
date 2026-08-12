/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The server, over real stdio.
 *
 * Everything here goes through a spawned `node dist/lib/mcp/server.js` and
 * newline-delimited JSON on its stdin, because that is the only interface a
 * client has. Calling `handle()` in-process would test the switch statement and
 * skip the two things that actually break a stdio server: framing (a message
 * that arrives in two chunks, a notification that must produce no bytes at all)
 * and stream purity (one stray `console.log` and every client drops the
 * connection).
 *
 * It runs against the BUILT artifact rather than the source, because the built
 * artifact is what `npx ngwr-mcp` runs — shebang, execute bit and all. On a
 * checkout that has never run `pnpm build:lib` there is nothing to test, so the
 * block skips instead of failing.
 */

// Built by `scripts/build-mcp.ts` into the package root, three levels up from
// `projects/lib/mcp`. Composed with `resolve` rather than `new URL(…,
// import.meta.url)`: the bundler rewrites that pattern into an asset URL and
// hands back `http://localhost:3000/…`.
const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'dist', 'lib', 'mcp', 'server.js');

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
  const child = spawn(process.execPath, [SERVER], { env });
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

describe.skipIf(!existsSync(SERVER))('ngwr-mcp over stdio', () => {
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
    const manifest = resolve(SERVER, '..', '..', 'package.json');
    const own = JSON.parse(readFileSync(manifest, 'utf8')) as { version: string };

    // It used to read `npm_package_version`, which npx sets from the project that
    // INVOKED the server — so a consumer app had its own version reported back as
    // the catalog's. Installing the tarball into a scratch package is what showed
    // it: in this repo the two are the same file. Both runs must answer the
    // package's own version, including the one whose environment says otherwise.
    expect(replyTo(poisoned, 1).result?.['serverInfo']).toMatchObject({ version: own.version });
    expect(replyTo(bare, 1).result?.['serverInfo']).toMatchObject({ version: own.version });
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
