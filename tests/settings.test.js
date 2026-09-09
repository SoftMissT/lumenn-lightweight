import { describe, it, expect, beforeEach } from "vitest";
import {
  registerSettings,
  getQuality,
  getOverridePercent,
  getAutoOptimize,
  getSkipExisting,
} from "../src/settings.mjs";

describe("settings", () => {
  beforeEach(() => {
    game.settings._store = {};
  });

  it("registers all settings", () => {
    registerSettings();
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
  });

  it("getQuality returns default", () => {
    registerSettings();
    expect(getQuality()).toBe(0.85);
  });

  it("getOverridePercent returns default", () => {
    registerSettings();
    expect(getOverridePercent()).toBe(25);
  });

  it("getAutoOptimize returns default", () => {
    registerSettings();
    expect(getAutoOptimize()).toBe(true);
  });

  it("getSkipExisting returns default based on threshold", () => {
    registerSettings();
    expect(getSkipExisting()).toBe(true);
  });
});
