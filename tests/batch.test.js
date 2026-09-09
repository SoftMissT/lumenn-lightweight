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
});
