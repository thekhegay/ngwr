import type { SandboxProject } from './types';

/**
 * Hands a generated project to StackBlitz.
 *
 * StackBlitz's own documented entry point for this is a plain form POST to
 * `/run` with one hidden input per file, which is why there is no SDK here:
 * `@stackblitz/sdk` would be a runtime dependency (AGENTS.md asks for a strong
 * justification and there is none) to wrap eleven lines of DOM, and the POST
 * has no version to drift from.
 *
 * A form and not `fetch`, because the response is a whole editor: the browser
 * has to navigate to it, in a tab of its own, on a real user gesture. That
 * gesture is also the reason nothing here is guarded for SSR — the module is
 * only ever reached from a click handler, through a dynamic import, so it does
 * not exist during the prerender.
 */

const ENDPOINT = 'https://stackblitz.com/run';

/**
 * `node` rather than `angular-cli`: the legacy template pins its own toolchain
 * and cannot install an arbitrary Angular version, while `node` boots the
 * `package.json` the project builder wrote. That is what makes the sandbox
 * track this repo's Angular rather than StackBlitz's.
 */
const TEMPLATE = 'node';

function hidden(form: HTMLFormElement, name: string, value: string): void {
  const input = form.ownerDocument.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

function openInStackBlitz(project: SandboxProject, title: string, description: string): void {
  const form = document.createElement('form');
  form.method = 'post';
  // `?file=` decides which file the editor opens on. Pointing it at the markup
  // rather than at `package.json` is the difference between landing on the
  // snippet and landing on a manifest nobody came to read.
  //
  // The path goes in RAW, and that was observed rather than reasoned: a project
  // POSTed with `?file=src%2Fapp%2Fapp.html` opened the editor on `README.md`,
  // because StackBlitz matches the parameter against its own file paths and a
  // percent-encoded separator matches none of them. Each SEGMENT is still
  // encoded, so a `#` or a `?` in a name cannot end the query early — that part
  // is defensive, since every path the builder emits is plain ASCII today.
  const openFile = project.openFile.split('/').map(encodeURIComponent).join('/');
  form.action = `${ENDPOINT}?file=${openFile}`;
  form.target = '_blank';
  form.style.display = 'none';

  for (const [path, contents] of Object.entries(project.files)) {
    hidden(form, `project[files][${path}]`, contents);
  }
  hidden(form, 'project[title]', title);
  hidden(form, 'project[description]', description);
  hidden(form, 'project[template]', TEMPLATE);
  hidden(form, 'project[tags][]', 'angular');
  hidden(form, 'project[tags][]', 'ngwr');
  hidden(form, 'project[settings]', JSON.stringify({ compile: { clearConsole: false } }));

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export { openInStackBlitz };
