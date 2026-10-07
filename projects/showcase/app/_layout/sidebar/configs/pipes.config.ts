import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/** The Pipes group of the Reference sidebar — one row per pipe. */
export const PIPES_GROUP: SidebarGroup = {
  title: 'Pipes',
  children: [
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrBytes),
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrDate),
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrMark),
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrNumber),
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrPlural),
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrRange),
    wrLink(ROUTES.reference, ROUTES.reference.pipes, ROUTES.reference.pipes.wrTruncate),
  ],
};
