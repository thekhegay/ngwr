import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOverlayOrder } from './wr-overlay-order';

/**
 * jsdom has no top layer, so each host carries its own `hidePopover` and
 * `showPopover`, which write the calls to `calls` and keep `top`, the order
 * the browser would paint in: the last entry is over every earlier one. What
 * is asserted is the order of the calls and the order they leave behind.
 */
describe('WrOverlayOrder', () => {
  let order: WrOverlayOrder;
  let container: HTMLElement;
  let calls: string[] = [];
  let top: string[] = [];

  const host = (name: string, popover = true): HTMLElement => {
    const el = document.createElement('div');
    el.dataset['name'] = name;
    if (popover) el.setAttribute('popover', 'manual');
    el.hidePopover = () => {
      if (!top.includes(name)) throw new DOMException('Not showing', 'InvalidStateError');
      calls.push(`hide ${name}`);
      top = top.filter(n => n !== name);
    };
    el.showPopover = () => {
      calls.push(`show ${name}`);
      top = [...top, name];
    };
    container.appendChild(el);
    if (popover) top = [...top, name];
    return el;
  };

  beforeEach(() => {
    order = TestBed.inject(WrOverlayOrder);
    container = document.createElement('div');
    document.body.appendChild(container);
    calls = [];
    top = [];
  });

  afterEach(() => container.remove());

  it('raises the toasts over an overlay that keeps the default', () => {
    const toasts = host('toasts');
    order.add(host('dialog'));

    order.raiseToasts(toasts);

    expect(calls).toEqual(['hide toasts', 'show toasts']);
    expect(top).toEqual(['dialog', 'toasts']);
  });

  it('leaves toasts that are already under a covering overlay where they are', () => {
    const toasts = host('toasts');
    order.raiseToasts(toasts);
    order.add(host('dialog'), 'below');
    calls = [];

    order.raiseToasts(toasts);

    expect(calls).toEqual([]);
    expect(top).toEqual(['toasts', 'dialog']);
  });

  it('promotes a covering overlay again after a toast host that opened over it', () => {
    order.add(host('dialog'), 'below');
    const toasts = host('toasts');

    order.raiseToasts(toasts);

    expect(calls).toEqual(['hide toasts', 'show toasts', 'hide dialog', 'show dialog']);
    expect(top).toEqual(['toasts', 'dialog']);
  });

  it('keeps covering overlays in the order they opened, with what sits between them', () => {
    order.add(host('dialog'), 'below');
    host('select-panel');
    order.add(host('drawer'), 'below');
    const toasts = host('toasts');

    order.raiseToasts(toasts);

    expect(top).toEqual(['toasts', 'dialog', 'select-panel', 'drawer']);
  });

  it('puts the toasts between an overlay under them and a covering one opened later', () => {
    order.add(host('outer'));
    order.add(host('inner'), 'below');
    const toasts = host('toasts');

    order.raiseToasts(toasts);

    expect(calls).toEqual(['hide toasts', 'show toasts', 'hide inner', 'show inner']);
    expect(top).toEqual(['outer', 'toasts', 'inner']);
  });

  it('lets the newer overlay decide, and the covering one under it again once it closes', () => {
    const toasts = host('toasts');
    order.raiseToasts(toasts);
    order.add(host('outer'), 'below');
    const innerHost = host('inner');
    const closeInner = order.add(innerHost);

    order.raiseToasts(toasts);
    expect(top).toEqual(['outer', 'inner', 'toasts']);

    calls = [];
    innerHost.remove();
    top = top.filter(n => n !== 'inner');
    closeInner();

    expect(calls).toEqual(['hide toasts', 'show toasts', 'hide outer', 'show outer']);
    expect(top).toEqual(['toasts', 'outer']);
  });

  it('moves nothing when a covering overlay closes over the toasts', () => {
    const toasts = host('toasts');
    order.raiseToasts(toasts);
    const dialog = host('dialog');
    const close = order.add(dialog, 'below');
    calls = [];

    dialog.remove();
    top = top.filter(n => n !== 'dialog');
    close();

    expect(calls).toEqual([]);
    expect(top).toEqual(['toasts']);

    // And the next toast is on top again, as with no covering overlay at all.
    order.add(host('later'));
    order.raiseToasts(toasts);
    expect(top).toEqual(['later', 'toasts']);
  });

  it('gives focus back when promoting an overlay moved it', () => {
    // Outside the host: jsdom does not focus inside a `[popover]` it never shows.
    const dialog = host('dialog');
    const field = document.createElement('input');
    const autofocus = document.createElement('button');
    container.append(field, autofocus);
    const show = dialog.showPopover.bind(dialog);
    dialog.showPopover = () => {
      show();
      autofocus.focus();
    };
    order.add(dialog, 'below');
    field.focus();
    let focusMoves = 0;
    field.addEventListener('focus', () => focusMoves++);

    order.raiseToasts(host('toasts'));

    expect(calls).toContain('show dialog');
    expect(document.activeElement).toBe(field);
    expect(focusMoves).toBe(1);
  });

  it('does not touch focus that stayed where it was', () => {
    const field = document.createElement('input');
    container.append(field);
    order.add(host('dialog'), 'below');
    field.focus();
    let focusMoves = 0;
    field.addEventListener('focus', () => focusMoves++);

    order.raiseToasts(host('toasts'));

    expect(document.activeElement).toBe(field);
    expect(focusMoves).toBe(0);
  });

  it('leaves a host that is not a popover alone', () => {
    order.add(host('dialog', false), 'below');
    const toasts = host('toasts', false);

    order.raiseToasts(toasts);

    expect(calls).toEqual([]);
  });

  it('forgets the toast host with its last toast', () => {
    const toasts = host('toasts');
    order.raiseToasts(toasts);
    order.dropToasts();
    calls = [];

    order.add(host('dialog'), 'below')();

    expect(calls).toEqual([]);
  });
});
