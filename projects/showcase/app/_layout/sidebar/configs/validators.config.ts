import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * The Validators group of the Reference sidebar — one row per `WrValidators`
 * member. Flat and alphabetical for the same reason as {@link UTILS_GROUP}:
 * the cluster is a top-level group now, and the sidebar renders two levels.
 */
export const VALIDATORS_GROUP: SidebarGroup = {
  title: 'Validators',
  children: [
    ROUTES.reference.validators.cardNumber,
    ROUTES.reference.validators.cvc,
    ROUTES.reference.validators.hexColor,
    ROUTES.reference.validators.iban,
    ROUTES.reference.validators.match,
    ROUTES.reference.validators.matchFields,
    ROUTES.reference.validators.maxDate,
    ROUTES.reference.validators.minDate,
    ROUTES.reference.validators.noWhitespace,
    ROUTES.reference.validators.oneOf,
    ROUTES.reference.validators.url,
  ],
};
