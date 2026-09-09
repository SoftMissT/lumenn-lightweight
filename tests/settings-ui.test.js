import { describe, expect, it } from "vitest";
import { findLumennSettingsMount } from "../src/lumenn-lightweight.js";

describe("Lumenn settings UI", () => {
  it("mounts only inside the Lumenn settings panel", () => {
    const panel = {};
    const anchor = {
      closest: (selector) =>
        selector === '.tab[data-tab="lumenn-lightweight"]' ? panel : null,
    };
    const root = {
      querySelector: (selector) =>
        selector === '[name="lumenn-lightweight.skipThresholdBytes"]'
          ? anchor
          : null,
    };

    expect(findLumennSettingsMount(root)).toBe(panel);
  });

  it("does not fall back to the settings window root", () => {
    const root = { querySelector: () => null };
    expect(findLumennSettingsMount(root)).toBeNull();
  });
});
