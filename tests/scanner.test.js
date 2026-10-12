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
        tokens: [
          {
            id: "t1",
            name: "Goblin placed",
            texture: { src: "assets/placed-token.png" },
          },
          {
            id: "t2",
            name: "Already WebP",
            texture: { src: "assets/placed-token.webp" },
          },
        ],
      },
    ];

    const results = scanUnoptimizedAssets({ actors, items, scenes });

    expect(results).toHaveLength(5);
    expect(results.map((r) => r.imgPath)).toEqual([
      "assets/goblin.png",
      "assets/goblin_token.png",
      "assets/sword.jpg",
      "assets/clouds.png",
      "assets/placed-token.png",
    ]);
    expect(results.at(-1)).toMatchObject({
      id: "t1",
      type: "Scene Token",
      sceneId: "s1",
      name: "Scene 1 / Goblin placed",
      format: "PNG",
    });
    expect(results.map((asset) => asset.format)).toEqual([
      "PNG",
      "PNG",
      "JPG",
      "PNG",
      "PNG",
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

  it("reads v14 Scene Levels without touching deprecated Scene#background/#foreground", () => {
    const scene = {
      id: "s1",
      name: "Palco",
      levels: new Map([
        [
          "l1",
          {
            id: "l1",
            name: "Térreo",
            background: { src: "assets/floor.png" },
            foreground: { src: "assets/roof.jpg" },
          },
        ],
        [
          "l2",
          {
            id: "l2",
            name: "Subsolo",
            background: { src: "assets/cellar.webp" },
            foreground: { src: null },
          },
        ],
      ]),
      tokens: [],
    };
    for (const key of ["background", "foreground"]) {
      Object.defineProperty(scene, key, {
        get() {
          throw new Error(`deprecated Scene#${key} was read`);
        },
      });
    }

    const results = scanUnoptimizedAssets({ scenes: [scene] });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      type: "Scene Background",
      imgPath: "assets/floor.png",
      sceneId: "s1",
      levelId: "l1",
      name: "Palco / Térreo",
    });
    expect(results[1]).toMatchObject({
      type: "Scene Foreground",
      imgPath: "assets/roof.jpg",
      levelId: "l1",
    });
  });
});
