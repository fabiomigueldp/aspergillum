export type RandomSource = () => number;

export class VariantShuffleBag<T> {
  readonly #variants: readonly T[];
  readonly #random: RandomSource;
  #remaining: T[] = [];
  #last: T | undefined;

  constructor(variants: readonly T[], random: RandomSource = Math.random) {
    if (variants.length === 0) throw new Error("A shuffle bag requires at least one variant");
    this.#variants = [...variants];
    this.#random = random;
  }

  next(): T {
    if (this.#remaining.length === 0) this.#refill();
    const value = this.#remaining.pop();
    if (value === undefined) throw new Error("Shuffle bag unexpectedly became empty");
    this.#last = value;
    return value;
  }

  #refill(): void {
    this.#remaining = [...this.#variants];
    for (let index = this.#remaining.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.max(0, Math.min(0.999999999, this.#random())) * (index + 1));
      [this.#remaining[index], this.#remaining[randomIndex]] = [
        this.#remaining[randomIndex] as T,
        this.#remaining[index] as T,
      ];
    }
    if (this.#remaining.length > 1 && this.#remaining.at(-1) === this.#last) {
      [this.#remaining[0], this.#remaining[this.#remaining.length - 1]] = [
        this.#remaining.at(-1) as T,
        this.#remaining[0] as T,
      ];
    }
  }
}
