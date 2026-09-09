import { describe, expect, it, vi } from "vitest";
import {
  findExistingWebpReference,
  reconcileExistingWebpReferences,
  runAutomaticReferenceRepair,
} from "../src/automatic-repair.mjs";

describe("automatic WebP reference repair", () => {
  it("prefers a WebP sibling in the same directory", () => {
    expect(
      findExistingWebpReference(
        [
          "assets/portraits/Hero.webp",
          "assets/archive/Hero.webp",
        ],
        "assets/portraits/Hero.png",
      ),
    ).toBe("assets/portraits/Hero.webp");
  });

  it("matches URL-encoded references to decoded FilePicker paths", () => {
    expect(
      findExistingWebpReference(
        ["assets/Locais/C7 - ADVERTÊNCIA Sementes sem explicação.webp"],
        "assets/Locais/C7%20-%20ADVERT%C3%8ANCIA%20Sementes%20sem%20explica%C3%A7%C3%A3o.png",
      ),
    ).toBe("assets/Locais/C7 - ADVERTÊNCIA Sementes sem explicação.webp");
  });

  it("uses a relocated WebP only when its basename is unique", () => {
    expect(
      findExistingWebpReference(
        ["assets/new/Hero.webp"],
        "assets/old/Hero.jpeg",
      ),
    ).toBe("assets/new/Hero.webp");
    expect(
      findExistingWebpReference(
        ["assets/a/Hero.webp", "assets/b/Hero.webp"],
        "assets/old/Hero.jpeg",
      ),
    ).toBeNull();
  });

  it("updates matching document references automatically and indexes once", async () => {
    const assets = [
      { id: "a1", name: "Hero", imgPath: "assets/Hero.png" },
      { id: "a2", name: "Sword", imgPath: "assets/Sword.jpg" },
    ];
    const browseFn = vi.fn().mockResolvedValue({
      dirs: [],
      files: ["assets/Hero.webp", "assets/Sword.jpg"],
    });
    const updateDocumentFn = vi.fn().mockResolvedValue(undefined);

    const results = await reconcileExistingWebpReferences(assets, {
      browseFn,
      updateDocumentFn,
    });

    expect(browseFn).toHaveBeenCalledTimes(1);
    expect(updateDocumentFn).toHaveBeenCalledWith(
      assets[0],
      "assets/Hero.webp",
    );
    expect(results).toEqual({ repaired: 1, unchanged: 1, failed: [] });
  });

  it("runs once per module version for the active GM", async () => {
    const previous = {
      user: game.user,
      users: game.users,
      modules: game.modules,
      actors: game.actors,
      items: game.items,
      scenes: game.scenes,
      get: game.settings.get,
      set: game.settings.set,
    };
    const values = new Map([["lastReferenceRepairVersion", ""]]);
    const actor = {
      id: "actor-1",
      name: "Hero",
      img: "assets/Hero.png",
      update: vi.fn().mockResolvedValue(undefined),
    };
    const browse = vi.fn().mockResolvedValue({
      dirs: [],
      files: ["assets/Hero.png", "assets/Hero.webp"],
    });
    vi.stubGlobal("FilePicker", { browse });

    try {
      game.user = { id: "gm-1", isGM: true };
      game.users = { activeGM: game.user };
      game.modules = new Map([["lumenn-lightweight", { version: "0.0.9" }]]);
      game.actors = [actor];
      game.actors.get = (id) => (id === actor.id ? actor : undefined);
      game.items = [];
      game.scenes = [];
      game.settings.get = (_module, key) => values.get(key);
      game.settings.set = vi.fn(async (_module, key, value) => {
        values.set(key, value);
      });

      const first = await runAutomaticReferenceRepair();
      const second = await runAutomaticReferenceRepair();

      expect(first).toMatchObject({ repaired: 1, failed: [] });
      expect(second).toBeNull();
      expect(actor.update).toHaveBeenCalledWith({ img: "assets/Hero.webp" });
      expect(browse).toHaveBeenCalledTimes(1);
      expect(game.settings.set).toHaveBeenCalledWith(
        "lumenn-lightweight",
        "lastReferenceRepairVersion",
        "0.0.9",
      );
    } finally {
      game.user = previous.user;
      game.users = previous.users;
      game.modules = previous.modules;
      game.actors = previous.actors;
      game.items = previous.items;
      game.scenes = previous.scenes;
      game.settings.get = previous.get;
      game.settings.set = previous.set;
      vi.unstubAllGlobals();
    }
  });
});
