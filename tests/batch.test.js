import { describe, it, expect, vi } from "vitest";
import { processBatch } from "../src/batch.mjs";
import * as compression from "../src/compression.mjs";

describe("processBatch", () => {
  it("processes batch asynchronously and calls callbacks", async () => {
    const assets = [
      { id: "a1", imgPath: "fake.png", name: "Goblin" },
      { id: "a2", imgPath: "fail.png", name: "Fail" },
    ];

    const fetchImageFn = vi.fn().mockImplementation(async (path) => {
      if (path === "fail.png") throw new Error("Network error");
      // Return a large blob so compression (which returns a small blob) succeeds
      return new Blob([new Uint8Array(10000)], { type: "image/png" });
    });

    const saveImageFn = vi.fn().mockResolvedValue("fake.webp");
    const updateDocumentFn = vi.fn().mockResolvedValue();
    const onProgress = vi.fn();

    // Mock compressImage using vi.spyOn to avoid hoisting issues
    const spyCompress = vi
      .spyOn(compression, "compressImage")
      .mockResolvedValue({
        blob: new Blob(["web_data"], { type: "image/webp" }),
        originalSize: 10000,
        newSize: 500,
        skipped: false,
      });
    const spyReplace = vi
      .spyOn(compression, "shouldReplace")
      .mockReturnValue(true);

    const results = await processBatch(assets, {
      quality: 0.85,
      overridePercent: 0,
      onProgress,
      fetchImageFn,
      saveImageFn,
      updateDocumentFn,
    });

    expect(results.processed).toBe(1);
    expect(results.failed).toHaveLength(1);
    expect(results.failed[0].id).toBe("a2");
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(updateDocumentFn).toHaveBeenCalledWith(assets[0], "fake.webp");

    spyCompress.mockRestore();
    spyReplace.mockRestore();
  });

  it("republishes and updates a broken encoded WebP reference", async () => {
    const asset = {
      id: "a1",
      imgPath: "worlds/test/Hwan%20Enko.webp",
      name: "Hwan",
    };
    const originalWebp = new Blob(["small"], { type: "image/webp" });
    const recoveredPath = "worlds/recovered/Hwan Enko.webp";
    const saveImageFn = vi.fn().mockResolvedValue(recoveredPath);
    const updateDocumentFn = vi.fn().mockResolvedValue();

    const results = await processBatch([asset], {
      skipThresholdBytes: 1000,
      fetchImageFn: vi.fn().mockResolvedValue({
        blob: originalWebp,
        repairRequired: true,
        sourcePath: recoveredPath,
      }),
      saveImageFn,
      updateDocumentFn,
    });

    expect(saveImageFn).toHaveBeenCalledWith(recoveredPath, originalWebp);
    expect(updateDocumentFn).toHaveBeenCalledWith(
      asset,
      recoveredPath,
    );
    expect(results).toMatchObject({ processed: 1, repaired: 1, skipped: 0 });
  });

  it("uses an existing WebP sibling without compressing or uploading it", async () => {
    const asset = { id: "a1", imgPath: "assets/portrait.png", name: "Hero" };
    const updateDocumentFn = vi.fn().mockResolvedValue();
    const saveImageFn = vi.fn();

    const results = await processBatch([asset], {
      fetchImageFn: vi.fn().mockResolvedValue({
        blob: new Blob(["webp"], { type: "image/webp" }),
        sourcePath: "assets/portrait.webp",
        repairRequired: true,
        existingOptimizedPath: true,
      }),
      saveImageFn,
      updateDocumentFn,
    });

    expect(saveImageFn).not.toHaveBeenCalled();
    expect(updateDocumentFn).toHaveBeenCalledWith(
      asset,
      "assets/portrait.webp",
    );
    expect(results).toMatchObject({ processed: 1, repaired: 1, skipped: 0 });
  });

  const compressedOk = () =>
    vi.spyOn(compression, "compressImage").mockResolvedValue({
      blob: new Blob(["w"], { type: "image/webp" }),
      originalSize: 10000,
      newSize: 100,
      skipped: false,
    });
  const bigBlob = () => new Blob([new Uint8Array(10000)]);

  it("records name, type, path and the stage where an item broke", async () => {
    const asset = {
      id: "bg1",
      imgPath: "assets/gone.png",
      name: "Cena",
      type: "Scene Background",
    };
    const results = await processBatch([asset], {
      quality: 0.85,
      overridePercent: 0,
      fetchImageFn: vi.fn().mockRejectedValue(new Error("Arquivo não encontrado")),
      saveImageFn: vi.fn(),
      updateDocumentFn: vi.fn(),
    });

    expect(results.failed).toEqual([
      {
        id: "bg1",
        name: "Cena",
        type: "Scene Background",
        path: "assets/gone.png",
        stage: "fetch",
        error: "Arquivo não encontrado",
      },
    ]);
  });

  it("reports the upload stage when saving the WebP fails", async () => {
    const spy = compressedOk();
    const results = await processBatch(
      [{ id: "a1", imgPath: "a.png", name: "A", type: "Actor" }],
      {
        quality: 0.85,
        overridePercent: 0,
        fetchImageFn: vi.fn().mockResolvedValue(bigBlob()),
        saveImageFn: vi.fn().mockRejectedValue(new Error("sem permissão")),
        updateDocumentFn: vi.fn(),
      },
    );

    expect(results.failed[0]).toMatchObject({
      stage: "upload",
      error: "sem permissão",
    });
    spy.mockRestore();
  });

  it("fetches, compresses and uploads a shared file once, then reuses the result", async () => {
    const spy = compressedOk();
    const fetchImageFn = vi.fn().mockResolvedValue(bigBlob());
    const saveImageFn = vi.fn().mockResolvedValue("shared.webp");
    const updateDocumentFn = vi.fn().mockResolvedValue();
    const assets = ["a", "b", "c"].map((id) => ({
      id,
      imgPath: "shared.png",
      name: id,
      type: "Actor",
    }));

    const results = await processBatch(assets, {
      quality: 0.85,
      overridePercent: 0,
      fetchImageFn,
      saveImageFn,
      updateDocumentFn,
    });

    expect(fetchImageFn).toHaveBeenCalledTimes(1);
    expect(saveImageFn).toHaveBeenCalledTimes(1);
    expect(updateDocumentFn).toHaveBeenCalledTimes(3);
    expect(results.processed).toBe(3);
    spy.mockRestore();
  });

  it("lists every document that points to a missing file without fetching it again", async () => {
    const fetchImageFn = vi.fn().mockRejectedValue(new Error("missing"));
    const assets = ["a", "b"].map((id) => ({
      id,
      imgPath: "gone.png",
      name: id,
      type: "Item",
    }));

    const results = await processBatch(assets, {
      quality: 0.85,
      overridePercent: 0,
      fetchImageFn,
      saveImageFn: vi.fn(),
      updateDocumentFn: vi.fn(),
    });

    expect(fetchImageFn).toHaveBeenCalledTimes(1);
    expect(results.failed.map((f) => f.id)).toEqual(["a", "b"]);
    expect(results.failed.every((f) => f.stage === "fetch")).toBe(true);
  });

  it("does not let one document's update failure fail its siblings", async () => {
    const spy = compressedOk();
    const updateDocumentFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("documento sumiu"))
      .mockResolvedValue();
    const assets = ["a", "b"].map((id) => ({
      id,
      imgPath: "shared.png",
      name: id,
      type: "Actor",
    }));

    const results = await processBatch(assets, {
      quality: 0.85,
      overridePercent: 0,
      fetchImageFn: vi.fn().mockResolvedValue(bigBlob()),
      saveImageFn: vi.fn().mockResolvedValue("shared.webp"),
      updateDocumentFn,
    });

    expect(results.failed.map((f) => f.id)).toEqual(["a"]);
    expect(results.failed[0].stage).toBe("update");
    expect(results.processed).toBe(1);
    spy.mockRestore();
  });
});
