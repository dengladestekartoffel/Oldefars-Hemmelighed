// Fortryd: gemmer tidligere udgaver af bordet. Mindst 20 trin tilbage.

export class Historik<T> {
  private stak: T[] = [];
  constructor(private readonly maks = 50) {}

  /** Gem tilstanden FØR en ændring. */
  gem(tilstand: T): void {
    this.stak.push(tilstand);
    if (this.stak.length > this.maks) this.stak.shift();
  }

  fortryd(): T | undefined {
    return this.stak.pop();
  }

  get antal(): number {
    return this.stak.length;
  }

  ryd(): void {
    this.stak = [];
  }
}
