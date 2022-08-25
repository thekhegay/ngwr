import { coerceBooleanProperty } from '@angular/cdk/coercion';

import { SafeAny } from '../types/safe-any';

export function toBoolean(value: boolean | string): boolean {
  return coerceBooleanProperty(value);
}

// eslint-disable
function propDecoratorFactory<T, D>(name: string, fallback: (v: T) => D): (target: SafeAny, propName: string) => void {
  function propDecorator(
    target: SafeAny,
    propName: string,
    originalDescriptor?: TypedPropertyDescriptor<SafeAny>
  ): SafeAny {
    const privatePropName = `$$__wrPropDecorator__${propName}`;

    if (Object.prototype.hasOwnProperty.call(target, privatePropName)) {
      console.warn(`The prop "${privatePropName}" is already exist, it will be overrided by ${name} decorator.`);
    }

    Object.defineProperty(target, privatePropName, {
      configurable: true,
      writable: true
    });

    return {
      get(): string {
        return originalDescriptor && originalDescriptor.get
          ? originalDescriptor.get.bind(this)()
          : this[privatePropName];
      },
      set(value: T): void {
        if (originalDescriptor && originalDescriptor.set) {
          originalDescriptor.set.bind(this)(fallback(value));
        }
        this[privatePropName] = fallback(value);
      }
    };
  }

  return propDecorator;
}

/**
 * Input decorator that handle a prop to do get/set automatically with toBoolean
 *
 * Why not using @InputBoolean alone without @Input? AOT needs @Input to be visible
 *
 * @howToUse
 * ```
 * @Input() @InputBoolean() visible: boolean = false;
 *
 * // Act as below:
 * // @Input()
 * // get visible() { return this.__visible; }
 * // set visible(value) { this.__visible = value; }
 * // __visible = false;
 * ```
 */
export function InputBoolean(): SafeAny {
  return propDecoratorFactory('InputBoolean', toBoolean);
}
