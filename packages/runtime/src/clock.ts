export interface Clock {
  now(): Date;
  iso(): string;
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }

  public iso(): string {
    return this.now().toISOString();
  }
}

export class FrozenClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: string | Date = '2026-10-31T05:00:00.000Z') {
    this.currentTime = new Date(initialTime);
  }

  public now(): Date {
    return new Date(this.currentTime.getTime());
  }

  public iso(): string {
    return this.currentTime.toISOString();
  }

  public advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  public set(time: string | Date): void {
    this.currentTime = new Date(time);
  }
}
