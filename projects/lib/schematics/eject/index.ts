/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';

import type { Schema } from './schema';
import { type Exports, type ReadSource, type Repository, collectEjected, ejectRawUrl, ejectRefusal } from './source';

/** What the schematic reads from the ngwr manifest it shipped in. */
interface EjectManifest {
  readonly version: string;
  readonly exports: Exports;
  readonly repository?: Repository;
}

/** The slice of `fetch` the schematic uses, so a spec can stand in for the network. */
type EjectFetch = (url: string) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;

/**
 * The manifest of the installed ngwr, two levels up from the compiled schematic:
 * `node_modules/ngwr/package.json`. `null` where that cannot be read, as in a
 * spec, which loads this source as an ES module and passes its own.
 */
function shippedManifest(): EjectManifest | null {
  if (typeof __dirname !== 'string') return null;

  const file = join(__dirname, '..', '..', 'package.json');
  if (!existsSync(file)) return null;

  const manifest = JSON.parse(readFileSync(file, 'utf8')) as Partial<EjectManifest> & { readonly name?: string };

  return manifest.name === 'ngwr' && manifest.version && manifest.exports
    ? { version: manifest.version, exports: manifest.exports, repository: manifest.repository }
    : null;
}

/** The library folder of a checkout given as its root or as `projects/lib` itself. */
function localLibrary(from: string): string {
  const dir = isAbsolute(from) ? from : resolve(process.cwd(), from);
  const lib = [join(dir, 'projects', 'lib'), dir].find(candidate => existsSync(join(candidate, 'package.json')));
  if (!lib) {
    throw new SchematicsException(
      `ngwr:eject: ${from} is not an ngwr checkout: no package.json there or under its projects/lib.`
    );
  }

  return lib;
}

/** Reads the sources of a release from GitHub, at the tag `v<version>`. */
function remoteSource(manifest: EjectManifest, fetchFile: EjectFetch): ReadSource {
  return async file => {
    const url = ejectRawUrl(manifest.version, file, manifest.repository);
    let response: Awaited<ReturnType<EjectFetch>>;
    try {
      response = await fetchFile(url);
    } catch (error) {
      throw new SchematicsException(
        `ngwr:eject: could not reach ${url} (${error instanceof Error ? error.message : String(error)}). ` +
          'The published package carries no sources, so they are fetched from GitHub. Offline, pass ' +
          '`--from <dir>` with a local checkout of the ngwr repository.'
      );
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new SchematicsException(`ngwr:eject: ${url} answered ${response.status}.`);

    return response.text();
  };
}

/**
 * `ng g ngwr:eject <entry>`: copies one component's source into the app, where
 * it can be edited freely and `ng update` no longer reaches it.
 *
 * The sources are fetched from the repository at the tag of the installed
 * version, since the tarball ships compiled output only; `--from` reads a local
 * checkout instead. Imports that reach other entry points are rewritten to
 * their package paths, so the copy still uses the installed ngwr for everything
 * but itself. See `./source` for which files are copied and how.
 *
 * `manifest` and `fetchFile` are parameters so a spec can pass its own; the
 * devkit calls this with the options alone.
 */
function eject(
  options: Schema,
  manifest: EjectManifest | null = shippedManifest(),
  fetchFile: EjectFetch = url => fetch(url)
): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const entry = options.entry
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/^ngwr\//, '')
      .replace(/^\/+|\/+$/g, '');
    if (!entry) throw new SchematicsException('ngwr:eject: missing `entry`.');
    if (!manifest) throw new SchematicsException('ngwr:eject: could not read the installed ngwr manifest.');

    const refusal = ejectRefusal(entry, manifest.exports);
    if (refusal) throw new SchematicsException(`ngwr:eject: ${refusal}`);

    let read: ReadSource;
    let version = manifest.version;
    if (options.from) {
      const lib = localLibrary(options.from);
      version =
        (JSON.parse(readFileSync(join(lib, 'package.json'), 'utf8')) as { version?: string }).version ?? version;
      read = file => Promise.resolve(existsSync(join(lib, file)) ? readFileSync(join(lib, file), 'utf8') : null);
    } else {
      read = remoteSource(manifest, fetchFile);
    }

    const ejected = await collectEjected(entry, manifest.exports, version, read);
    if (!ejected) {
      throw new SchematicsException(
        options.from
          ? `ngwr:eject: ${options.from} has no ${entry}/public-api.ts.`
          : `ngwr:eject: ${ejectRawUrl(version, `${entry}/public-api.ts`, manifest.repository)} does not exist: ` +
              `there is no v${version} tag, or it has no ngwr/${entry}. Pass \`--from <dir>\` with a local checkout.`
      );
    }
    if (!ejected.declarable) {
      throw new SchematicsException(
        `ngwr:eject: ngwr/${entry} declares no component or directive, so there is nothing to eject.`
      );
    }

    const dest = (options.path?.trim() ? options.path.trim() : `src/app/ngwr/${entry}`).replace(/^\/+|\/+$/g, '');
    const taken = ejected.files.map(file => `${dest}/${file.path}`).filter(path => tree.exists(path));
    if (taken.length > 0) {
      throw new SchematicsException(
        `ngwr:eject: ${taken[0]} already exists. Delete the folder first, or pass another \`--path\`.`
      );
    }

    for (const file of ejected.files) tree.create(`${dest}/${file.path}`, file.content);

    const { logger } = context;
    logger.info(`✓ Copied ngwr/${entry}@${version} into ${dest} (${ejected.files.length} files).`);
    logger.info(`  Import it from that folder instead of 'ngwr/${entry}'. \`ng update\` no longer updates this copy.`);
    if (ejected.styles) {
      const sheet = `${dest}/${ejected.styles.replace(/\/_index\.scss$/, '')}`;
      logger.info(`  In the global stylesheet, replace \`@use 'ngwr/${entry}';\` with a \`@use\` of ${sheet}.`);
    }
    logger.info(
      `  The copy keeps its selectors and classes: never import it and 'ngwr/${entry}' into the same component. ` +
        'To use both, rename the selector and the `.wr-*` classes in the copy.'
    );

    for (const warning of ejected.warnings) {
      logger.warn(`ngwr: ${dest}/${warning.file}:${warning.line} '${warning.specifier}' ${warning.reason}.`);
    }

    return tree;
  };
}

export default eject;
export type { EjectFetch, EjectManifest };
