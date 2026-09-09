import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanUnoptimizedAssets } from "../src/scanner.mjs";

describe("scanner", () => {
  it("identifies unoptimized assets from collections", () => {
    const actors = [
      {
        id: "a1",
        name: "Actor 1",
        img: "assets/goblin.png",
        prototypeToken: { texture: { src: "assets/goblin_token.png" } },
      },
      { id: "a2", name: "Actor 2", img: "icons/svg/mystery-man.svg" },
      { id: "a3", name: "Actor 3", img: "assets/already.webp" },
    ];
    const items = [{ id: "i1", name: "Item 1", img: "assets/sword.jpg" }];
    const scenes = [
      {
        id: "s1",
        name: "Scene 1",
        background: { src: "assets/map.webp" },
        foreground: "assets/clouds.png",
      },
    ];

    const results = scanUnoptimizedAssets({ actors, items, scenes });

    expect(results).toHaveLength(4);
    expect(results.map((r) => r.imgPath)).toEqual([
      "assets/goblin.png",
      "assets/goblin_token.png",
      "assets/sword.jpg",
      "assets/clouds.png",
    ]);
  });

  it("keeps shared paths as separate document update targets", () => {
    const actors = [
      { id: "a1", name: "Actor 1", img: "assets/goblin.png" },
      { id: "a2", name: "Actor 2", img: "assets/goblin.png" },
    ];
    const results = scanUnoptimizedAssets({ actors });
    expect(results).toHaveLength(2);
    expect(results.map((asset) => asset.id)).toEqual(["a1", "a2"]);
  });
});
