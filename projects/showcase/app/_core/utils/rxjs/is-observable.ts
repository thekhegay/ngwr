import { SafeAny } from 'ngwr/core/types';

import { Observable } from 'rxjs';

export function isObservable(obj: SafeAny | Observable<SafeAny>): obj is Observable<SafeAny> {
  return !!obj && typeof obj.subscribe === 'function';
}
