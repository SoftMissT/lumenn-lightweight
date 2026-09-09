import { describe, it, expect, beforeEach } from "vitest";
import {
  registerSettings,
  getQuality,
  getOverridePercent,
  getAutoOptimize,
  getSkipExisting,
} from "../src/settings.mjs";

describe("settings", () => {
  class BatchMenu {}

  beforeEach(() => {
    game.settings._store = {};
    game.settings._menus = {};
  });

  it("registers all settings", () => {
    registerSettings(BatchMenu);
    expect(game.settings._store["lumenn-lightweight.compressionQuality"]).toBe(
      0.85,
    );
    expect(game.settings._store["lumenn-lightweight.overridePercent"]).toBe(25);
    expect(game.settings._store["lumenn-lightweight.uploadHookEnabled"]).toBe(
      true,
    );
    expect(game.settings._store["lumenn-lightweight.skipThresholdBytes"]).toBe(
      102400,
    );
    expect(
      game.settings._store["lumenn-lightweight.lastReferenceRepairVersion"],
    ).toBe("");
    expect(game.settings._menus["lumenn-lightweight.batchMenu"]).toMatchObject({
      type: BatchMenu,
      restricted: true,
      icon: "fas fa-compress-alt",
    });
  });

  it("getQuality returns default", () => {
    registerSettings(BatchMenu);
    expect(getQuality()).toBe(0.85);
  });

  it("getOverridePercent returns default", () => {
    registerSettings(BatchMenu);
    expect(getOverridePercent()).toBe(25);
  });

  it("getAutoOptimize returns default", () => {
    registerSettings(BatchMenu);
    expect(getAutoOptimize()).toBe(true);
  });

  it("getSkipExisting returns default based on threshold", () => {
    registerSettings(BatchMenu);
    expect(getSkipExisting()).toBe(true);
  });
});
