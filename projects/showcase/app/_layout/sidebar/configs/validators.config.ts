import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.validators];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/**
 * The Validators group of the Reference sidebar — one row per `WrValidators`
 * member. Flat and alphabetical for the same reason as {@link UTILS_GROUP}:
 * the cluster is a top-level group now, and the sidebar renders two levels.
 */
export const VALIDATORS_GROUP: SidebarGroup = {
  title: 'Validators',
  children: [
    link(ROUTES.reference.validators.cardNumber),
    link(ROUTES.reference.validators.cvc),
    link(ROUTES.reference.validators.hexColor),
    link(ROUTES.reference.validators.iban),
    link(ROUTES.reference.validators.match),
    link(ROUTES.reference.validators.matchFields),
    link(ROUTES.reference.validators.maxDate),
    link(ROUTES.reference.validators.minDate),
    link(ROUTES.reference.validators.noWhitespace),
    link(ROUTES.reference.validators.oneOf),
    link(ROUTES.reference.validators.urlValidator),
  ],
};
