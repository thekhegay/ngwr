import { coerceBooleanProperty } from '@angular/cdk/coercion';

import { SafeAny } from 'ngwr/core/types';

export function InputBoolean(): PropertyDecorator {
  return (target: SafeAny, propertyKey: string | symbol): void => {
    const coercedBooleanKey = `$$__wr__${String(propertyKey)}`;

    Object.defineProperty(target, propertyKey, {
      get: function (): boolean {
        return this[coercedBooleanKey] || false;
      },
      set: function (value: boolean | unknown): void {
        this[coercedBooleanKey] = coerceBooleanProperty(value);
      },
    });
  };
}
