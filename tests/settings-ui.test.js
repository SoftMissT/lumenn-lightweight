import { describe, expect, it } from "vitest";
import { groupAssetsByKind, summarizeAssetFormats } from "../src/ui.mjs";

describe("asset grouping", () => {
  it("separates portraits, tokens, items and scene layers", () => {
    const assets = [
      { type: "Actor", name: "Portrait" },
      { type: "Actor Token", name: "Token" },
      { type: "Scene Token", name: "Placed Token" },
      { type: "Item", name: "Item" },
      { type: "Scene Background", name: "Background" },
      { type: "Scene Foreground", name: "Foreground" },
    ];

    const groups = groupAssetsByKind(assets);
    expect(groups.map((group) => [group.key, group.count])).toEqual([
      ["portraits", 1],
      ["tokens", 2],
      ["items", 1],
      ["sceneBackgrounds", 1],
      ["sceneForegrounds", 1],
    ]);
    expect(groups.filter((group) => group.active)).toHaveLength(1);
  });

  it("counts PNG, JPG and JPEG separately without presenting WebP", () => {
    expect(
      summarizeAssetFormats([
        { format: "PNG" },
        { format: "PNG" },
        { format: "JPG" },
        { format: "JPEG" },
        { format: "WEBP" },
      ]),
    ).toEqual([
      { format: "PNG", count: 2 },
      { format: "JPG", count: 1 },
      { format: "JPEG", count: 1 },
    ]);
  });
});
