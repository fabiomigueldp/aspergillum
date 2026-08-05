import { describe, expect, it } from "vitest";
import { VariantShuffleBag } from "../../src/presentation/audio/variant-shuffle-bag";

describe("VariantShuffleBag", () => {
  it("plays every variant once before beginning a new cycle", () => {
    const bag = new VariantShuffleBag(["a", "b", "c"], () => 0.25);
    expect(new Set([bag.next(), bag.next(), bag.next()])).toEqual(new Set(["a", "b", "c"]));
  });

  it("does not repeat the last variant at a cycle boundary", () => {
    const bag = new VariantShuffleBag(["a", "b", "c"], () => 0.999);
    const values = Array.from({ length: 12 }, () => bag.next());
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).not.toBe(values[index - 1]);
    }
  });

  it("supports a one-variant family without failing", () => {
    const bag = new VariantShuffleBag(["only"], () => 0);
    expect([bag.next(), bag.next()]).toEqual(["only", "only"]);
  });
});
