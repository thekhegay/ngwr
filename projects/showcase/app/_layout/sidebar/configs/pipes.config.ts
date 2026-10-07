import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/** The Pipes group of the Reference sidebar — one row per pipe. */
export const PIPES_GROUP: SidebarGroup = {
  title: 'Pipes',
  children: [
    ROUTES.reference.pipes.wrBytes,
    ROUTES.reference.pipes.wrDate,
    ROUTES.reference.pipes.wrMark,
    ROUTES.reference.pipes.wrNumber,
    ROUTES.reference.pipes.wrPlural,
    ROUTES.reference.pipes.wrRange,
    ROUTES.reference.pipes.wrTruncate,
  ],
};
