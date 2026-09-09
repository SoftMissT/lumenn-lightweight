import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isImageFile,
  isWebpFile,
  getWebpFilename,
  shouldReplace,
  compressImage,
} from "../src/compression.mjs";

describe("isImageFile", () => {
  it("returns true for PNG files", () => {
    expect(isImageFile("photo.png")).toBe(true);
  });
  it("returns false for non-image files", () => {
    expect(isImageFile("document.pdf")).toBe(false);
  });
  it("recognizes image extensions case-insensitively and ignores query strings", () => {
    expect(isImageFile("portrait.PNG?cache=1")).toBe(true);
  });
});

describe("isWebpFile", () => {
  it("recognizes existing WebP paths", () => {
    expect(isWebpFile("folder/portrait.WEBP?cache=1")).toBe(true);
  });
});

describe("getWebpFilename", () => {
  it("converts PNG to WebP", () => {
    expect(getWebpFilename("image.png")).toBe("image.webp");
  });
  it("preserves dotted filenames and directories", () => {
    expect(getWebpFilename("assets/hero.v2.final.png")).toBe(
      "assets/hero.v2.final.webp",
    );
  });
});

describe("shouldReplace", () => {
  it("returns true when savings exceed threshold", () => {
    expect(shouldReplace(1000, 500, 25)).toBe(true);
  });
});

describe("compressImage", () => {
  beforeEach(() => {
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      close: vi.fn(),
    });

    globalThis.OffscreenCanvas = class {
      constructor(w, h) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return { drawImage: vi.fn() };
      }
      convertToBlob() {
        return Promise.resolve(
          new Blob(["compressed"], { type: "image/webp" }),
        );
      }
    };
  });

  it("skips every existing webp regardless of size", async () => {
    const blob = new Blob(["small_webp"], { type: "image/webp" });
    const result = await compressImage(blob, 0.85, {
      skipThresholdBytes: 10000,
    });
    expect(result.skipped).toBe(true);
    expect(result.originalSize).toBe(10);
  });

  it("compresses other images", async () => {
    const blob = new Blob(["fake_png_data_large"], { type: "image/png" });
    const result = await compressImage(blob, 0.85, {
      skipThresholdBytes: 10000,
    });
    expect(result.skipped).toBe(false);
    expect(result.blob.type).toBe("image/webp");
  });
});
