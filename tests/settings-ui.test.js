import { describe, expect, it, vi } from "vitest";
import {
  fetchFoundryImage,
  getLiteralPercentPath,
  groupAssetsByKind,
} from "../src/ui.mjs";

describe("asset grouping", () => {
  it("separates portraits, tokens, items and scene layers", () => {
    const assets = [
      { type: "Actor", name: "Portrait" },
      { type: "Actor Token", name: "Token" },
      { type: "Item", name: "Item" },
      { type: "Scene Background", name: "Background" },
      { type: "Scene Foreground", name: "Foreground" },
    ];

    const groups = groupAssetsByKind(assets);
    expect(groups.map((group) => [group.key, group.count])).toEqual([
      ["portraits", 1],
      ["tokens", 1],
      ["items", 1],
      ["sceneBackgrounds", 1],
      ["sceneForegrounds", 1],
    ]);
    expect(groups.filter((group) => group.active)).toHaveLength(1);
  });
});

describe("encoded Foundry path recovery", () => {
  it("escapes percent signs only in the URL path", () => {
    expect(
      getLiteralPercentPath("worlds/test/Hwan%20Enko.webp?cache=1"),
    ).toBe("worlds/test/Hwan%2520Enko.webp?cache=1");
  });

  it("recovers a file uploaded with a literal encoded name after a 404", async () => {
    const recovered = new Blob(["webp"], { type: "image/webp" });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, blob: async () => recovered });

    const result = await fetchFoundryImage(
      "worlds/test/Hwan%20Enko.webp",
      fetchFn,
    );

    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "worlds/test/Hwan%2520Enko.webp",
    );
    expect(result).toEqual({ blob: recovered, repairRequired: true });
  });
});
