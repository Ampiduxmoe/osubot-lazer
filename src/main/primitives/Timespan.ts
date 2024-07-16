export class Timespan {
  private _milliseconds = 0;
  private _seconds = 0;
  private _minutes = 0;
  private _hours = 0;
  private _days = 0;

  public get milliseconds(): number {
    return this._milliseconds;
  }
  public get seconds(): number {
    return this._seconds;
  }
  public get minutes(): number {
    return this._minutes;
  }
  public get hours(): number {
    return this._hours;
  }
  public get days(): number {
    return this._days;
  }

  constructor(milliseconds = 0, seconds = 0, minutes = 0, hours = 0, days = 0) {
    this.addMilliseconds(milliseconds);
    this.addSeconds(seconds);
    this.addMinutes(minutes);
    this.addHours(hours);
    this.addDays(days);
  }

  addMilliseconds(value: number): Timespan {
    if (value === 0) {
      return this;
    }
    const seconds = Math.floor(value / Timespan.millisInSecond);
    this._milliseconds += value - seconds * Timespan.millisInSecond;
    this.addSeconds(seconds);
    return this;
  }

  addSeconds(value: number): Timespan {
    if (value === 0) {
      return this;
    }
    const fraction = value % 1;
    this.addMilliseconds(fraction * Timespan.millisInSecond);
    const remainingValue = value - fraction;
    const minutes = Math.floor(remainingValue / Timespan.secondsInMinute);
    this._seconds += remainingValue - minutes * Timespan.secondsInMinute;
    this.addMinutes(minutes);
    return this;
  }

  addMinutes(value: number): Timespan {
    if (value === 0) {
      return this;
    }
    const fraction = value % 1;
    this.addSeconds(fraction * Timespan.secondsInMinute);
    const remainingValue = value - fraction;
    const hours = Math.floor(remainingValue / Timespan.minutesInHour);
    this._minutes += remainingValue - hours * Timespan.minutesInHour;
    this.addHours(hours);
    return this;
  }

  addHours(value: number): Timespan {
    if (value === 0) {
      return this;
    }
    const fraction = value % 1;
    this.addMinutes(fraction * Timespan.minutesInHour);
    const remainingValue = value - fraction;
    const days = Math.floor(remainingValue / Timespan.hoursInDay);
    this._hours += remainingValue - days * Timespan.hoursInDay;
    this.addDays(days);
    return this;
  }

  addDays(value: number): Timespan {
    if (value === 0) {
      return this;
    }
    const fraction = value % 1;
    this.addHours(fraction * Timespan.hoursInDay);
    const remainingValue = value - fraction;
    this._days += remainingValue;
    return this;
  }

  totalMiliseconds(): number {
    const sum =
      this._milliseconds +
      this._seconds * Timespan.millisInSecond +
      this._minutes * Timespan.millisInMinute +
      this._hours * Timespan.millisInHour +
      this._days * Timespan.millisInDay;
    return sum;
  }

  totalSeconds(): number {
    return this.totalMiliseconds() / Timespan.millisInSecond;
  }

  totalMinutes(): number {
    return this.totalMiliseconds() / Timespan.millisInMinute;
  }

  totalHours(): number {
    return this.totalMiliseconds() / Timespan.millisInHour;
  }

  totalDays(): number {
    return this.totalMiliseconds() / Timespan.millisInDay;
  }

  private static millisInSecond = 1e3;
  private static millisInMinute = 60e3;
  private static millisInHour = 3600e3;
  private static millisInDay = 86400e3;

  private static secondsInMinute = 60;
  private static minutesInHour = 60;
  private static hoursInDay = 24;
}
