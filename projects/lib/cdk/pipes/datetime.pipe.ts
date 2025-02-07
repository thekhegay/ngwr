import { formatDate } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { TranslocoService } from '@jsverse/transloco';

interface DateTimePipeResult {
  date: string;
  time: string;
}

@Pipe({
  standalone: true,
  name: 'datetime',
})
export class DatetimePipe implements PipeTransform {
  private readonly translocoService = inject(TranslocoService);

  transform(dateTime: string | number | Date): Observable<DateTimePipeResult> {
    return this.translocoService.langChanges$.pipe(
      map(lang => {
        const date = formatDate(dateTime, 'dd MMMM YYYY', lang);
        const time = formatDate(dateTime, 'HH:mm', lang);

        return {
          date,
          time,
        };
      })
    );
  }
}
