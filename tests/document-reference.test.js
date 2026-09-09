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
});
