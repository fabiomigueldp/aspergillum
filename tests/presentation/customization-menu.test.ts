import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import type { Player } from "@minecraft/server";
import type { UIRawMessage } from "@minecraft/server-ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomizationMenuModel } from "../../src/presentation/customization-menu";

// Exercise the production presentation with only the native UI API replaced.
// This verifies callback/lifecycle semantics, not Bedrock rendering or input.
class ObservableNumber {
  readonly callbacks = new Set<(value: number) => void>();
  readonly clientWritable: boolean;

  constructor(private value: number, options?: { clientWritable: boolean }) {
    this.clientWritable = options?.clientWritable === true;
  }

  getData(): number { return this.value; }
  setData(value: number): void {
    if (value === this.value) return;
    this.value = value;
    for (const callback of this.callbacks) callback(value);
  }
  subscribe(callback: (value: number) => void): (value: number) => void {
    this.callbacks.add(callback);
    return callback;
  }
  unsubscribe(callback: (value: number) => void): boolean {
    return this.callbacks.delete(callback);
  }
}

class CustomForm {
  static readonly instances: CustomForm[] = [];
  static showFailure: "throw" | "reject" | undefined;
  readonly selections = new Map<string, ObservableNumber>();
  readonly buttons = new Map<string, () => void>();
  showing = false;
  closeCalls = 0;
  closeFailure: "before" | "after" | undefined;
  onClose: (() => void) | undefined;
  private resolve: () => void = () => {};

  constructor(_player: Player, _title: UIRawMessage) {
    CustomForm.instances.push(this);
  }

  spacer(): this { return this; }
  header(): this { return this; }
  divider(): this { return this; }
  dropdown(label: UIRawMessage, value: ObservableNumber): this {
    if (!value.clientWritable) throw new Error("InvalidObservableError");
    this.selections.set(label.translate!, value);
    return this;
  }
  button(label: UIRawMessage, callback: () => void): this {
    this.buttons.set(label.translate!, callback);
    return this;
  }
  isShowing(): boolean { return this.showing; }
  show(): Promise<void> {
    if (CustomForm.showFailure === "throw") throw new Error("show failed");
    if (CustomForm.showFailure === "reject") return Promise.reject(new Error("show failed"));
    this.showing = true;
    return new Promise((resolve) => { this.resolve = resolve; });
  }
  close(): void {
    this.closeCalls += 1;
    if (!this.showing) throw new Error("FormVisibilityError");
    const failure = this.closeFailure;
    this.closeFailure = undefined;
    this.onClose?.();
    if (failure === "before") throw new Error("EngineError");
    this.dismissNatively();
    if (failure === "after") throw new Error("EngineError");
  }
  dismissNatively(): void {
    this.showing = false;
    this.resolve();
  }
}

const bundled = buildSync({
  entryPoints: [fileURLToPath(new URL("../../src/presentation/customization-menu.ts", import.meta.url))],
  bundle: true,
  format: "cjs",
  platform: "node",
  external: ["@minecraft/server-ui"],
  write: false,
});
const presentation = { exports: {} as typeof import("../../src/presentation/customization-menu") };
new Function("require", "module", "exports", bundled.outputFiles[0]!.text)(
  (id: string) => {
    if (id !== "@minecraft/server-ui") throw new Error(`Unexpected native dependency: ${id}`);
    return { CustomForm, ObservableNumber };
  },
  presentation,
  presentation.exports,
);
const { showCustomizationMenu } = presentation.exports;

function createActions() {
  return {
    applyCosmetic: vi.fn((_id: string) => true),
    applySprayProfile: vi.fn((_id: string) => true),
    restoreClassic: vi.fn(() => true),
    finishAndRetrieve: vi.fn(() => true),
    close: vi.fn(),
  };
}

function open(model: CustomizationMenuModel = { cosmeticId: "classic", sprayProfileId: "standard" }) {
  const actions = createActions();
  showCustomizationMenu({ id: "table-player" } as Player, model, actions);
  return { form: CustomForm.instances.at(-1)!, actions };
}

function selection(form: CustomForm, name: string): ObservableNumber {
  return form.selections.get(`ui.aspergillum.table.${name}.label`)!;
}

function button(form: CustomForm, name: string): () => void {
  return form.buttons.get(`ui.aspergillum.table.${name}`)!;
}

async function flushClose(): Promise<void> {
  // Drain show().catch().finally(), including any continuation after cleanup.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

afterEach(async () => {
  for (const form of CustomForm.instances) form.dismissNatively();
  await flushClose();
  CustomForm.instances.length = 0;
  CustomForm.showFailure = undefined;
  vi.restoreAllMocks();
});

describe("sacristan table presentation lifecycle", () => {
  it("keeps dropdown changes immediate and Close does not retrieve or restore", async () => {
    const { form, actions } = open();
    selection(form, "spray").setData(1);
    selection(form, "metal").setData(3);
    selection(form, "grip").setData(3);
    expect(actions.applySprayProfile).toHaveBeenCalledExactlyOnceWith("processional");
    expect(actions.applyCosmetic.mock.calls).toEqual([["bronze_chestnut"], ["bronze_ivory"]]);
    expect(actions.close).not.toHaveBeenCalled();
    button(form, "close")();
    await flushClose();
    expect(actions.finishAndRetrieve).not.toHaveBeenCalled();
    expect(actions.restoreClassic).not.toHaveBeenCalled();
    expect(actions.close).toHaveBeenCalledTimes(1);
  });

  it("restores only after the action succeeds and suppresses reactive duplicate writes", () => {
    const { form, actions } = open({ cosmeticId: "bronze_ivory", sprayProfileId: "contained" });
    actions.restoreClassic.mockReturnValueOnce(false);
    button(form, "restore")();
    expect([...form.selections.values()].map((value) => value.getData())).toEqual([2, 3, 3]);
    button(form, "restore")();
    expect(actions.restoreClassic).toHaveBeenCalledTimes(2);
    expect([...form.selections.values()].map((value) => value.getData())).toEqual([0, 0, 0]);
    expect(actions.applyCosmetic).not.toHaveBeenCalled();
    expect(actions.applySprayProfile).not.toHaveBeenCalled();
    selection(form, "spray").setData(1);
    expect(actions.applySprayProfile).toHaveBeenCalledExactlyOnceWith("processional");
  });

  it("does not close on a failed retrieval and still permits the existing retry", async () => {
    const { form, actions } = open();
    actions.finishAndRetrieve.mockReturnValueOnce(false);
    button(form, "finish")();
    expect(form.isShowing()).toBe(true);
    expect(form.closeCalls).toBe(0);
    expect(actions.close).not.toHaveBeenCalled();
    button(form, "finish")();
    expect(actions.finishAndRetrieve).toHaveBeenCalledTimes(2);
    expect(form.closeCalls).toBe(1);
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
  });

  it.each(["close", "finish"])("ignores repeated or queued actions after %s before finally", async (name) => {
    const { form, actions } = open();
    const queuedProfile = [...selection(form, "spray").callbacks][0]!;
    const queuedCosmetic = [...selection(form, "metal").callbacks][0]!;
    button(form, name)();
    expect(actions.close).not.toHaveBeenCalled();
    expect(() => button(form, "close")()).not.toThrow();
    expect(() => button(form, "finish")()).not.toThrow();
    button(form, "restore")();
    queuedProfile(1);
    queuedCosmetic(1);
    expect(actions.finishAndRetrieve).toHaveBeenCalledTimes(name === "finish" ? 1 : 0);
    expect(actions.restoreClassic).not.toHaveBeenCalled();
    expect(actions.applySprayProfile).not.toHaveBeenCalled();
    expect(actions.applyCosmetic).not.toHaveBeenCalled();
    expect(form.closeCalls).toBe(1);
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
  });

  it.each(["close", "finish"])("allows %s to recover when Close throws with the screen still open", async (retry) => {
    const { form, actions } = open();
    form.closeFailure = "before";
    form.onClose = () => {
      // Reentrant callbacks must stay blocked during the native close attempt.
      selection(form, "metal").setData(1);
      button(form, "restore")();
      button(form, "finish")();
      button(form, "close")();
    };
    expect(() => button(form, "close")()).toThrow("EngineError");
    form.onClose = undefined;
    expect(form.isShowing()).toBe(true);
    expect(actions.applyCosmetic).not.toHaveBeenCalled();
    expect(actions.restoreClassic).not.toHaveBeenCalled();
    expect(actions.finishAndRetrieve).not.toHaveBeenCalled();
    expect(actions.close).not.toHaveBeenCalled();
    selection(form, "spray").setData(1);
    expect(actions.applySprayProfile).toHaveBeenCalledExactlyOnceWith("processional");
    expect(() => button(form, retry)()).not.toThrow();
    expect(form.isShowing()).toBe(false);
    expect(form.closeCalls).toBe(2);
    expect(actions.finishAndRetrieve).toHaveBeenCalledTimes(retry === "finish" ? 1 : 0);
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
    expect([...form.selections.values()].map((value) => value.callbacks.size)).toEqual([0, 0, 0]);
  });

  it.each(["close", "finish"])("retries only dismissal through %s after retrieval succeeds but closing throws", async (retry) => {
    const { form, actions } = open();
    form.closeFailure = "before";
    expect(() => button(form, "finish")()).toThrow("EngineError");
    expect(form.isShowing()).toBe(true);
    expect(actions.finishAndRetrieve).toHaveBeenCalledTimes(1);
    expect(actions.close).not.toHaveBeenCalled();
    selection(form, "spray").setData(1);
    selection(form, "metal").setData(1);
    selection(form, "grip").setData(1);
    button(form, "restore")();
    expect(actions.applySprayProfile).not.toHaveBeenCalled();
    expect(actions.applyCosmetic).not.toHaveBeenCalled();
    expect(actions.restoreClassic).not.toHaveBeenCalled();
    expect(() => button(form, retry)()).not.toThrow();
    expect(form.isShowing()).toBe(false);
    expect(form.closeCalls).toBe(2);
    expect(actions.finishAndRetrieve).toHaveBeenCalledTimes(1);
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
    expect([...form.selections.values()].map((value) => value.callbacks.size)).toEqual([0, 0, 0]);
  });

  it("does not revive actions when close throws after the native screen has already closed", async () => {
    const { form, actions } = open();
    form.closeFailure = "after";
    expect(() => button(form, "close")()).toThrow("EngineError");
    expect(form.isShowing()).toBe(false);
    expect(() => button(form, "close")()).not.toThrow();
    button(form, "finish")();
    button(form, "restore")();
    selection(form, "spray").setData(1);
    expect(actions.finishAndRetrieve).not.toHaveBeenCalled();
    expect(actions.restoreClassic).not.toHaveBeenCalled();
    expect(actions.applySprayProfile).not.toHaveBeenCalled();
    expect(form.closeCalls).toBe(1);
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
    expect([...form.selections.values()].map((value) => value.callbacks.size)).toEqual([0, 0, 0]);
  });

  it("blocks all stale actions in the native dismissal gap before finally", async () => {
    const { form, actions } = open();
    form.dismissNatively();
    expect(actions.close).not.toHaveBeenCalled();
    selection(form, "spray").setData(1);
    selection(form, "metal").setData(3);
    selection(form, "grip").setData(2);
    button(form, "restore")();
    expect(actions.applySprayProfile).not.toHaveBeenCalled();
    expect(actions.applyCosmetic).not.toHaveBeenCalled();
    expect(actions.restoreClassic).not.toHaveBeenCalled();
    expect(() => button(form, "finish")()).not.toThrow();
    expect(() => button(form, "close")()).not.toThrow();
    expect(actions.finishAndRetrieve).not.toHaveBeenCalled();
    expect(form.closeCalls).toBe(0);
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
  });

  it.each(["native", "close", "finish"])("removes all subscriptions after %s dismissal", async (name) => {
    const { form, actions } = open();
    if (name === "native") form.dismissNatively();
    else button(form, name)();
    await flushClose();
    expect([...form.selections.values()].map((value) => value.callbacks.size)).toEqual([0, 0, 0]);
    for (const value of form.selections.values()) value.setData(1);
    expect(actions.applySprayProfile).not.toHaveBeenCalled();
    expect(actions.applyCosmetic).not.toHaveBeenCalled();
    expect(actions.close).toHaveBeenCalledTimes(1);
  });

  it("cleans subscriptions and releases once when show rejects", async () => {
    CustomForm.showFailure = "reject";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { form, actions } = open();
    await flushClose();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(actions.close).toHaveBeenCalledTimes(1);
    expect([...form.selections.values()].map((value) => value.callbacks.size)).toEqual([0, 0, 0]);
    expect(() => button(form, "close")()).not.toThrow();
    expect(() => button(form, "finish")()).not.toThrow();
    expect(actions.finishAndRetrieve).not.toHaveBeenCalled();
    expect(form.closeCalls).toBe(0);
  });

  it("cleans subscriptions and releases once while preserving a synchronous show error", async () => {
    CustomForm.showFailure = "throw";
    const actions = createActions();
    expect(() => showCustomizationMenu(
      { id: "table-player" } as Player,
      { cosmeticId: "classic", sprayProfileId: "standard" },
      actions,
    )).toThrow("show failed");
    const form = CustomForm.instances.at(-1)!;
    expect(actions.close).toHaveBeenCalledTimes(1);
    expect([...form.selections.values()].map((value) => value.callbacks.size)).toEqual([0, 0, 0]);
    expect(() => button(form, "close")()).not.toThrow();
    expect(() => button(form, "finish")()).not.toThrow();
    expect(actions.finishAndRetrieve).not.toHaveBeenCalled();
    await flushClose();
    expect(actions.close).toHaveBeenCalledTimes(1);
  });
});
