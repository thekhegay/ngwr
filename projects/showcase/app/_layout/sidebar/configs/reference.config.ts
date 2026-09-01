import type { SidebarGroup } from '../sidebar.types';

import { COMPONENT_GROUPS } from './components.config';
import { DIRECTIVES_GROUP } from './directives.config';
import { INTERFACES_GROUP } from './interfaces.config';
import { PIPES_GROUP } from './pipes.config';
import { SERVICES_GROUP } from './services.config';
import { UTILS_GROUP } from './utils.config';
import { VALIDATORS_GROUP } from './validators.config';

/**
 * The one sidebar every `/reference/*` page gets.
 *
 * Reference is seven clusters — components, directives, pipes, services,
 * utils, validators, interfaces — and each one used to ship a sidebar listing
 * only its own pages. "Reference" in the header lands on
 * `/reference/components`, whose sidebar was eighty-four links every one of
 * which pointed back into components, so from inside the section there was no
 * way to reach the other six at all: the only route to `WrStorage` in the
 * whole UI was a link in the FOOTER. A "Reference" group of seven cluster
 * names sat on top of each sidebar as the fix, which restored reachability
 * but cost a click and a level, and made the top of the sidebar a list of
 * words rather than of pages.
 *
 * The sizes are what make this version possible instead. Components is nine
 * category groups plus Squircle; the other six clusters are fifty-nine rows
 * in total, so each fits as ONE sibling group beside Buttons and Overlays.
 * Sixteen top-level rows, one of them expanded, every cluster one click away,
 * and a reader sees real pages at the top level.
 *
 * The order is deliberate: the component categories first, in their own run,
 * then the six API-kind clusters. Interleaving them alphabetically would put
 * Directives between Data and Display, which reads as a tenth component
 * category.
 *
 * A cluster added to the site and not to this list is as unreachable as the
 * six were — this array is the whole navigation for the section.
 */
export const REFERENCE_SIDEBAR: readonly SidebarGroup[] = [
  ...COMPONENT_GROUPS,
  DIRECTIVES_GROUP,
  PIPES_GROUP,
  SERVICES_GROUP,
  UTILS_GROUP,
  VALIDATORS_GROUP,
  INTERFACES_GROUP,
];
