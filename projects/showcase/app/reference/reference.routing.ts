import type { Routes } from '@angular/router';

import {
  COMPONENTS_SIDEBAR,
  DIRECTIVES_SIDEBAR,
  INTERFACES_SIDEBAR,
  PIPES_SIDEBAR,
  REFERENCE_SIDEBAR,
  SERVICES_SIDEBAR,
  UTILS_SIDEBAR,
  VALIDATORS_SIDEBAR,
} from '../_layout/sidebar/configs';

import type { DocIndexData } from '#core/components';
import { routes } from '#routing';

const reference = routes.reference;

/**
 * The section root and each of the seven cluster roots render a catalog page
 * (`DocIndexComponent`) instead of redirecting to their first child.
 *
 * They redirected until two usability tests of the published site said what it
 * costs: `/reference/components` answered with the Button page, so the list of
 * components existed only in the sidebar — unreachable from a search result,
 * and absent from the markdown twins entirely. A redirect also prerenders as a
 * meta-refresh stub, which `gen-md-docs.ts` skips, so `/reference/utils.md` and
 * its four siblings answered 200 with the SPA shell rather than markdown.
 *
 * Every one of them lists `REFERENCE_SIDEBAR` — the component narrows it to the
 * links under the route's own path (see `doc-index.ts`), so there is one source
 * for the catalog and the nav, and a page can never appear in one and not the
 * other.
 */
const index = (title: string, description: string, keywords: readonly string[]): { index: DocIndexData } => ({
  index: { title, description, keywords, groups: REFERENCE_SIDEBAR },
});

export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('#core/components/doc-index/doc-index'),
    data: index(
      'Reference',
      'Every public API ngwr ships, one page each — components, directives, pipes, services, utils, validators and interfaces.',
      ['ngwr reference', 'angular ui catalog', 'api']
    ),
  },
  {
    path: reference.components,
    data: {
      sidebar: COMPONENTS_SIDEBAR,
      ...index(
        'Components',
        'The whole component catalog, grouped by what each one is for. Every page carries live demos and the full input / output table.',
        ['angular components', 'ui catalog', 'ngwr components']
      ),
    },
    loadChildren: () => import('./components/components.routing'),
  },
  {
    path: reference.directives,
    data: {
      sidebar: DIRECTIVES_SIDEBAR,
      ...index(
        'Directives',
        'Standalone attribute directives — behaviour you add to markup you already have, rather than a component you swap in.',
        ['angular directives', 'ngwr directives']
      ),
    },
    loadChildren: () => import('./directives/directives.routing'),
  },
  {
    path: reference.pipes,
    data: {
      sidebar: PIPES_SIDEBAR,
      ...index(
        'Pipes',
        'Template-side formatting: dates, numbers, byte sizes, plurals, ranges, truncation and search highlighting.',
        ['angular pipes', 'ngwr pipes']
      ),
    },
    loadChildren: () => import('./pipes/pipes.routing'),
  },
  {
    path: reference.services,
    data: {
      sidebar: SERVICES_SIDEBAR,
      ...index(
        'Services',
        'Injectable APIs behind the components — theme, i18n, density, hotkeys, storage, clipboard, scrolling and the rest.',
        ['angular services', 'ngwr services', 'inject']
      ),
    },
    loadChildren: () => import('./services/services.routing'),
  },
  {
    path: reference.utils,
    data: {
      sidebar: UTILS_SIDEBAR,
      ...index(
        'Utils',
        'Small tree-shakable helpers from `ngwr/utils` — coercion, DOM and keyboard guards, maths, ids and logging.',
        ['angular utils', 'ngwr utils', 'helpers']
      ),
    },
    loadChildren: () => import('./utils/utils.routing'),
  },
  {
    path: reference.validators,
    data: {
      sidebar: VALIDATORS_SIDEBAR,
      ...index(
        'Validators',
        'The `WrValidators` set — form validators for the checks an app writes by hand over and over.',
        ['angular validators', 'ngwr validators', 'form validation']
      ),
    },
    loadChildren: () => import('./validators/validators.routing'),
  },
  {
    path: reference.interfaces,
    data: {
      sidebar: INTERFACES_SIDEBAR,
      ...index(
        'Interfaces',
        'The public types — what a component input accepts, what an output emits, and the cross-cutting aliases every entry point shares.',
        ['angular types', 'ngwr interfaces', 'typescript']
      ),
    },
    loadChildren: () => import('./interfaces/interfaces.routing'),
  },
] satisfies Routes;
