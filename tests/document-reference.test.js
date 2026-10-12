import { describe, expect, it, vi } from "vitest";
import { updateAssetDocumentReference } from "../src/document-reference.mjs";

describe("document image reference updates", () => {
  it.each([
    ["Actor", "actors", "img"],
    ["Actor Token", "actors", "prototypeToken.texture.src"],
    ["Item", "items", "img"],
    ["Scene Background", "scenes", "background.src"],
    ["Scene Foreground", "scenes", "foreground"],
  ])("updates %s through its exact Foundry field", async (type, key, field) => {
    const document = { update: vi.fn().mockResolvedValue(undefined) };
    const collections = {
      actors: new Map(),
      items: new Map(),
      scenes: new Map(),
    };
    collections[key].set("doc-1", document);

    await updateAssetDocumentReference(
      { id: "doc-1", type },
      "assets/image.webp",
      collections,
    );

    expect(document.update).toHaveBeenCalledWith({
      [field]: "assets/image.webp",
    });
  });

  it("fails instead of counting a missing document as updated", async () => {
    await expect(
      updateAssetDocumentReference(
        { id: "missing", type: "Actor" },
        "assets/image.webp",
        { actors: new Map(), items: new Map(), scenes: new Map() },
      ),
    ).rejects.toThrow("Documento Actor não encontrado: missing");
  });

  it("updates a placed token through its parent Scene", async () => {
    const token = {};
    const scene = {
      tokens: new Map([["token-1", token]]),
      updateEmbeddedDocuments: vi.fn().mockResolvedValue([token]),
    };

    await updateAssetDocumentReference(
      { id: "token-1", sceneId: "scene-1", type: "Scene Token" },
      "assets/token.webp",
      {
        actors: new Map(),
        items: new Map(),
        scenes: new Map([["scene-1", scene]]),
      },
    );

    expect(scene.updateEmbeddedDocuments).toHaveBeenCalledWith("Token", [
      { _id: "token-1", "texture.src": "assets/token.webp" },
    ]);
  });

  it.each([
    ["Scene Background", "background.src"],
    ["Scene Foreground", "foreground.src"],
  ])(
    "updates %s on a v14 Level through its parent Scene",
    async (type, levelField) => {
      const level = {};
      const scene = {
        levels: new Map([["lvl-1", level]]),
        updateEmbeddedDocuments: vi.fn().mockResolvedValue([level]),
      };

      await updateAssetDocumentReference(
        { id: "scene-1", sceneId: "scene-1", levelId: "lvl-1", type },
        "assets/map.webp",
        { scenes: new Map([["scene-1", scene]]) },
      );

      expect(scene.updateEmbeddedDocuments).toHaveBeenCalledWith("Level", [
        { _id: "lvl-1", [levelField]: "assets/map.webp" },
      ]);
    },
  );

  it("fails when the Level no longer exists", async () => {
    const scene = { levels: new Map(), updateEmbeddedDocuments: vi.fn() };

    await expect(
      updateAssetDocumentReference(
        {
          id: "scene-1",
          sceneId: "scene-1",
          levelId: "gone",
          type: "Scene Background",
        },
        "assets/map.webp",
        { scenes: new Map([["scene-1", scene]]) },
      ),
    ).rejects.toThrow("Level da Scene não encontrado: gone");
    expect(scene.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });
});
