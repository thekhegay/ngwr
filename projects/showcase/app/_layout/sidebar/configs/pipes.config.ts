import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.pipes];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/** The Pipes group of the Reference sidebar — one row per pipe. */
export const PIPES_GROUP: SidebarGroup = {
  title: 'Pipes',
  children: [
    link(ROUTES.reference.pipes.wrBytes),
    link(ROUTES.reference.pipes.wrDate),
    link(ROUTES.reference.pipes.wrMark),
    link(ROUTES.reference.pipes.wrNumber),
    link(ROUTES.reference.pipes.wrPlural),
    link(ROUTES.reference.pipes.wrRange),
    link(ROUTES.reference.pipes.wrTruncate),
  ],
};
