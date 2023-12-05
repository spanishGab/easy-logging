import { DateTime as _DateTime } from 'luxon';

class DateTime {
  private readonly instance = _DateTime;

  public nowUTC(): string {
    return this.instance.local().toUTC().toISO() ?? new Date(Date.now()).toISOString();
  }
}

export const datetime = new DateTime();
