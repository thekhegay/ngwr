import { buildSandboxProject } from './project';
import { openInStackBlitz } from './stackblitz';
import type { SandboxRequest } from './types';

/**
 * The lazy half of the sandbox: build a project, hand it to StackBlitz.
 *
 * It exists as its own module so `SandboxService` has exactly one thing to
 * `import()` — pulling in the builder and the poster separately would mean two
 * chunks and two chances for the click's transient activation to run out
 * before the tab opens.
 */

const DESCRIPTION = 'Generated from a live example on ngwr.dev — a signals-first Angular UI library.';

function openSandbox(request: SandboxRequest): void {
  const project = buildSandboxProject(request.title, request.files);
  openInStackBlitz(project, request.title, request.description ?? DESCRIPTION);
}

export { openSandbox };
