import { animate, AnimationTriggerMetadata, state, style, transition, trigger } from '@angular/animations';

export const WR_ANIMATION_ZOOM_CLASS_NAME_MAP = {
  enter: 'wr-animation-zoom-enter',
  enterActive: 'wr-animation-zoom-enter--active',
  leave: 'wr-animation-zoom-leave',
  leaveActive: 'wr-animation-zoom-leave--active',
};

export const WR_ANIMATION_FADE_CLASS_NAME_MAP = {
  enter: 'wr-animation-fade-enter',
  enterActive: 'wr-animation-fade-enter--active',
  leave: 'wr-animation-fade-leave',
  leaveActive: 'wr-animation-fade-leave--active',
};

export const wrDialogAnimations: {
  readonly dialogContainer: AnimationTriggerMetadata;
} = {
  dialogContainer: trigger('dialogContainer', [
    state('void, exit', style({})),
    state('enter', style({})),
    transition('* => enter', animate('.24s', style({}))),
    transition('* => void, * => exit', animate('.2s', style({}))),
  ]),
};
