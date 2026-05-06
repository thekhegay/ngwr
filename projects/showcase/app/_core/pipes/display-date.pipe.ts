import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { isDefined } from 'ngwr/cdk/rxjs';

@Pipe({
  standalone: true,
  name: 'displayDate',
})
export class DisplayDatePipe implements PipeTransform {
  transform(date: string | number | Date | null | undefined, format = 'd MMMM yyyy, HH:mm'): string {
    if (!isDefined(date)) {
      return '';
    }
    return formatDate(date, format, 'ru');
  }
}
