/** Named breakpoint identifiers — match the SCSS `_breakpoints.scss` keys. */
type WrBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Map of breakpoint → minimum viewport width in pixels. */
type WrBreakpointMap = Readonly<Record<WrBreakpoint, number>>;

export type { WrBreakpoint, WrBreakpointMap };
