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
});
