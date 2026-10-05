import { scanTemplate, type SandboxField, type TemplateScan } from './resolve';

/**
 * The TypeScript half of a snippet: a real component around the markup a page
 * shows, with the `imports` resolved from that markup against ngwr's selector
 * map.
 *
 * One builder with two callers, deliberately. The sandbox writes this file into
 * the StackBlitz project, and the docs page shows it on the TS tab beside the
 * HTML — and the whole value of the tab is that it is the same code the sandbox
 * would run. Two builders would be two answers to one question, and the one a
 * visitor reads would be the one nobody boots.
 *
 * What it cannot know is the data. A docs snippet is markup; the page owns the
 * values it reads, and the fields below are stubs named after what the markup
 * asked for. They are marked as stubs in the file rather than dressed up as a
 * working component, because a plausible fake is worse than an obvious hole.
 */

/** Placeholder per field kind. Nothing here is meant to be kept. */
const SEEDS: Readonly<Record<SandboxField['kind'], string>> = {
  value: 'null',
  object: '{}',
  list: '[]',
  method: '[]',
  signal: '[]',
};

/**
 * A comment terminator inside a generated JSDoc closes it early and the rest of
 * the file becomes code. Titles reach this from `document.title`, so they are
 * not ours to trust.
 */
function jsdocSafe(text: string): string {
  return text.replace(/\*\//g, '* /');
}

interface ComponentTsOptions {
  /** The markup the component renders. Scanned for its imports and fields. */
  readonly template: string;
  /** Element selector. */
  readonly selector: string;
  /** Exported class name. */
  readonly className: string;
  /** What the decorator's `templateUrl` points at. */
  readonly templateUrl: string;
  /** JSDoc lines above the decorator, without the comment markers. */
  readonly doc: readonly string[];
}

/** Build the component, from a scan the caller already has or from the markup. */
function buildComponentTs(options: ComponentTsOptions, scan: TemplateScan = scanTemplate(options.template)): string {
  const symbols = [...scan.imports.values()].flat();
  const importLines = [...scan.imports.entries()].map(
    ([path, names]) => `import { ${names.join(', ')} } from '${path}';`
  );

  const angular = importLines.filter(line => line.includes("'@angular/"));
  const rest = importLines.filter(line => !line.includes("'@angular/"));

  const fields = scan.fields.map(field => {
    if (field.kind === 'method') {
      return `  protected ${field.name}(...args: any[]): any {\n    return ${SEEDS.method};\n  }`;
    }
    // A signal, not a field: the markup read it as `x()` AND, half the time,
    // wrote it back as `x.set($event)` from the other end of a two-way binding.
    if (field.kind === 'signal') return `  protected readonly ${field.name} = signal<any>(${SEEDS.signal});`;
    return `  protected ${field.name}: any = ${SEEDS[field.kind]};`;
  });

  const needsSignal = scan.fields.some(field => field.kind === 'signal');

  const body =
    fields.length === 0
      ? '{}'
      : [
          '{',
          '  // Stubs. The page owned these values; the snippet shows the markup',
          '  // that reads them, not where they come from.',
          ...fields,
          '}',
        ].join('\n');

  return [
    `import { Component${needsSignal ? ', signal' : ''} } from '@angular/core';`,
    ...(angular.length > 0 ? angular : []),
    ...(rest.length > 0 ? ['', ...rest] : []),
    '',
    '/**',
    ...options.doc.map(line => ` * ${jsdocSafe(line)}`.trimEnd()),
    ' */',
    '@Component({',
    `  selector: '${options.selector}',`,
    `  templateUrl: '${options.templateUrl}',`,
    ...(symbols.length > 0 ? [`  imports: [${symbols.join(', ')}],`] : []),
    '})',
    `export class ${options.className} ${body}`,
    '',
  ].join('\n');
}

export { buildComponentTs, jsdocSafe, SEEDS, type ComponentTsOptions };
