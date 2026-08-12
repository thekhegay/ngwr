/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Catalog } from './catalog.js';
import { TOOLS, callTool, validateArguments } from './tools.js';

/**
 * The ngwr MCP server — stdio, JSON-RPC 2.0, no dependencies.
 *
 * **Hand-rolled rather than built on the MCP SDK, and that is a deliberate
 * trade.** This ships inside `ngwr`, whose only runtime dependency is `tslib`;
 * an SDK would put a dependency tree behind every `npm i ngwr` for a feature most
 * consumers never run. The protocol surface a tools-only server needs is a
 * handful of methods and a framing rule.
 *
 * What that trade costs is that the error paths are the author's problem, and the
 * first draft got several of them wrong in the same way: it answered the WRONG
 * ID, or nothing at all. A client that never receives a response for an id does
 * not fail — it waits, which is worse. Every branch here now ends in exactly one
 * reply per request, and none for a notification.
 *
 * Run it with `npx ngwr-mcp`, or point a client at
 * `node ./node_modules/ngwr/mcp/server.js`.
 *
 * @see https://modelcontextprotocol.io
 */

/** Versions this server knows how to speak. The newest is what it offers. */
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;

/**
 * How much unterminated input to hold before giving up on the line.
 *
 * No MCP limit exists to violate, but an unbounded buffer means a client that
 * never sends a newline grows this process until the machine complains. 32 MB is
 * far past any real message — the largest this server can be asked for is a few
 * hundred kilobytes.
 */
const MAX_LINE_BYTES = 32 * 1024 * 1024;

/**
 * How many requests one batch may carry.
 *
 * Measured, not guessed: 58,000 entirely valid `get_ngwr_api` calls in one 6.8 MB
 * batch made the single `JSON.stringify` of the reply array throw
 * `RangeError: Invalid string length`, which killed the process with ZERO bytes
 * written and none of the 58,000 ids answered — the exact failure this file's
 * docblock says was eliminated. 30,000 entries already peaked at 3.3 GB of
 * resident memory. No real client batches more than a handful.
 */
const MAX_BATCH = 256;

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

type Id = string | number | null;

/**
 * A message as it arrives: every field `unknown`, because none of them is
 * trusted until it has been checked. Declared rather than a `Record`, so reading
 * `request.method` is a property access the compiler knows about.
 */
interface Incoming {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

interface Params {
  protocolVersion?: unknown;
  name?: unknown;
  arguments?: unknown;
}

interface Response {
  readonly jsonrpc: '2.0';
  readonly id: Id;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

const catalog = new Catalog();

/**
 * Stdout carries the protocol and nothing else.
 *
 * A stray `console.log` anywhere in this process corrupts the stream and the
 * client drops the connection — which is why diagnostics go to stderr, and why
 * the catalog is read lazily rather than announced at start-up.
 */
function write(message: unknown): void {
  let line: string;

  try {
    line = JSON.stringify(message);
  } catch (error) {
    // Serialising the reply is the last thing that can fail, and failing here
    // used to take the process down before a single byte was written. An error
    // the client can correlate is worth more than a crash.
    line = JSON.stringify(err(null, INTERNAL_ERROR, `Reply could not be serialised: ${String(error)}`));
  }

  process.stdout.write(`${line}\n`);
}

function ok(id: Id, result: unknown): Response {
  return { jsonrpc: '2.0', id, result };
}

function err(id: Id, code: number, message: string): Response {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

/** JSON-RPC allows a String, a Number or Null. Anything else is not an id. */
function idOf(value: unknown): Id | undefined {
  if (typeof value === 'string' || typeof value === 'number' || value === null) return value;

  return undefined;
}

/**
 * One request to one response, or `null` for a notification.
 *
 * A notification is a request with NO `id` member — not one whose id is null,
 * which §4 says must still be answered.
 */
function respond(message: unknown): Response | null {
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    return err(null, INVALID_REQUEST, 'A request must be a JSON object.');
  }

  const request = message as Incoming;
  const notification = !('id' in request);
  const id = notification ? null : idOf(request.id);

  if (!notification && id === undefined) {
    return err(null, INVALID_REQUEST, 'A request id must be a string, a number or null.');
  }

  const reply = (response: Response): Response | null => (notification ? null : response);

  if (request.jsonrpc !== '2.0') {
    return reply(err(id ?? null, INVALID_REQUEST, 'Only JSON-RPC 2.0 is supported.'));
  }

  if (typeof request.method !== 'string') {
    return reply(err(id ?? null, INVALID_REQUEST, 'A request needs a method name.'));
  }

  // `null` params reads as "none given". Lenient on purpose: clients send it for
  // a method that takes nothing, and the version that let it through to a
  // destructure threw — which the framing layer then reported as a PARSE error
  // against a null id, so the real request was never answered at all.
  const raw = request.params;
  if (raw !== undefined && raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
    return reply(err(id ?? null, INVALID_PARAMS, 'Params must be an object.'));
  }

  const params = (raw ?? {}) as Params;

  try {
    const response = handle(id ?? null, request.method, params);

    return reply(response);
  } catch (error) {
    // A handler that throws is an internal error against the REAL id. Blaming
    // the parser, as the first version did, tells the client its message was
    // malformed and leaves the id it is waiting on unanswered for ever.
    return reply(err(id ?? null, INTERNAL_ERROR, error instanceof Error ? error.message : String(error)));
  }
}

function handle(id: Id, method: string, params: Params): Response {
  switch (method) {
    case 'initialize': {
      const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';

      return ok(id, {
        // Echo the client's version when it is one we speak, so an older client
        // is not told to upgrade for a server that would have worked.
        protocolVersion: PROTOCOL_VERSIONS.includes(asked as (typeof PROTOCOL_VERSIONS)[number])
          ? asked
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'ngwr', title: 'ngwr component catalog', version: catalog.version() },
        instructions:
          'Angular component library. Use search_ngwr first when you do not know an entry point name, ' +
          'then get_ngwr_api for exact signatures and get_ngwr_setup for the commands to wire it in.',
      });
    }

    case 'ping':
      return ok(id, {});

    case 'tools/list':
      return ok(id, { tools: TOOLS });

    case 'tools/call': {
      const name = params.name;
      if (typeof name !== 'string') return err(id, INVALID_PARAMS, 'tools/call needs a tool name.');

      const tool = TOOLS.find(candidate => candidate.name === name);
      // An unknown tool is a protocol error, not an answer. Returned as a
      // successful call it reads to an agent like the reply to its question.
      if (!tool) {
        return err(id, INVALID_PARAMS, `Unknown tool: ${name}. Available: ${TOOLS.map(t => t.name).join(', ')}.`);
      }

      const args = (params.arguments ?? {}) as Record<string, unknown>;
      if (typeof args !== 'object' || args === null || Array.isArray(args)) {
        return err(id, INVALID_PARAMS, `${name}: arguments must be an object.`);
      }

      // The schema is published at `tools/list`; honouring it is what stops a
      // wrong argument type reaching the tool and coming back as a raw V8
      // TypeError in the agent's face.
      const complaint = validateArguments(tool, args);
      if (complaint) return err(id, INVALID_PARAMS, `${name}: ${complaint}`);

      try {
        return ok(id, { content: [{ type: 'text', text: callTool(catalog, name, args) }] });
      } catch (error) {
        // A tool that throws is a failed CALL, not a failed request: reporting it
        // this way leaves the conversation intact and tells the agent what went
        // wrong, where a JSON-RPC error just looks like a broken server.
        return ok(id, {
          content: [
            { type: 'text', text: `${name} failed: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        });
      }
    }

    default:
      return err(id, METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }
}

/** One line in, at most one message out. Batches answer as a batch. */
function dispatch(line: string): void {
  let message: unknown;
  try {
    message = JSON.parse(line);
  } catch {
    write(err(null, PARSE_ERROR, 'Parse error'));
    return;
  }

  // Batching is part of the two older protocol revisions this server offers, and
  // silence is not a legal answer to any of them: the first version destructured
  // the array, found no method, and dropped every id in it.
  if (Array.isArray(message)) {
    if (message.length === 0) {
      write(err(null, INVALID_REQUEST, 'A batch must not be empty.'));
      return;
    }

    if (message.length > MAX_BATCH) {
      write(err(null, INVALID_REQUEST, `A batch may carry at most ${MAX_BATCH} requests.`));
      return;
    }

    const responses = message.map(respond).filter((response): response is Response => response !== null);
    if (responses.length > 0) write(responses);

    return;
  }

  const response = respond(message);
  if (response) write(response);
}

/**
 * Newline-delimited JSON on stdin.
 *
 * Buffered across chunks: a message longer than one read arrives in pieces, and a
 * parser that assumed one chunk per message would work in testing and drop every
 * large `tools/call` in the field.
 */
let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk: string) => {
  buffer += chunk;

  // `Buffer.byteLength`, not `.length`: the latter counts UTF-16 units, so
  // 93 MB of three-byte characters passed a 32 MB cap untouched.
  if (Buffer.byteLength(buffer, 'utf8') > MAX_LINE_BYTES) {
    // Discard only the oversize LINE and resynchronise on the next one. Clearing
    // the whole buffer threw away a complete, valid request that had already
    // arrived behind it — answered with nothing, which is the one outcome this
    // file is written to avoid.
    const newline = buffer.indexOf('\n');
    buffer = newline === -1 ? '' : buffer.slice(newline + 1);
    write(err(null, INVALID_REQUEST, 'Message exceeded the maximum size and was discarded.'));
  }

  let newline = buffer.indexOf('\n');
  while (newline !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    newline = buffer.indexOf('\n');

    if (line) dispatch(line);
  }
});

process.stdin.on('end', () => {
  // A client that closes without a trailing newline still asked something. The
  // version that exited here dropped it and reported success.
  const last = buffer.trim();
  buffer = '';
  if (last) dispatch(last);

  // NOT `process.exit()`: writes to a pipe are asynchronous above the kernel
  // buffer, and exiting discards whatever is still queued. A 1000-symbol
  // `get_ngwr_setup` came back cut at exactly 65 536 bytes — mid-string, with a
  // zero exit code. Setting the code and letting the loop drain sends all of it.
  process.exitCode = 0;
});

// A client that dies without closing stdin leaves this writing into a broken
// pipe. Exiting quietly is the correct end of a session, not a crash with a
// stack trace.
process.stdout.on('error', error => {
  if ((error as NodeJS.ErrnoException).code === 'EPIPE') process.exit(0);
});
