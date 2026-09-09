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

    expect(results).toHaveLength(5);
    expect(results.map((r) => r.imgPath)).toEqual([
      "assets/goblin.png",
      "assets/goblin_token.png",
      "assets/sword.jpg",
      "assets/map.webp",
      "assets/clouds.png"
    ]);
  });

  it("filters duplicates", () => {
    const actors = [
      { id: "a1", name: "Actor 1", img: "assets/goblin.png" },
      { id: "a2", name: "Actor 2", img: "assets/goblin.png" },
    ];
    const results = scanUnoptimizedAssets({ actors });
    expect(results).toHaveLength(1);
    expect(results[0].imgPath).toBe("assets/goblin.png");
  });
});
