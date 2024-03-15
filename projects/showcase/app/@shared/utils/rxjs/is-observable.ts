import { Observable } from 'rxjs';

import { SafeAny } from 'ngwr/core/types';

export function isObservable(obj: SafeAny | Observable<SafeAny>): obj is Observable<SafeAny> {
  return !!obj && typeof obj.subscribe === 'function';
}
