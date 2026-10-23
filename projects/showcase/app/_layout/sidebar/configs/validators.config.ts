import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * The Validators group of the Reference sidebar — one row per `WrValidators`
 * member. Flat and alphabetical for the same reason as {@link UTILS_GROUP}:
 * the cluster is a top-level group now, and the sidebar renders two levels.
 */
export const VALIDATORS_GROUP: SidebarGroup = {
  title: 'Validators',
  children: [
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.cardNumber),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.cvc),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.hexColor),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.iban),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.match),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.matchFields),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.maxDate),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.minDate),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.noWhitespace),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.oneOf),
    wrLink(ROUTES.reference, ROUTES.reference.validators, ROUTES.reference.validators.urlValidator),
  ],
};
