import { describe, expect, it, vi } from "vitest";
import {
  createFoundryImageFetcher,
  findUniqueAssetByStem,
  getLiteralPercentPath,
  getSiblingImagePaths,
  getWildcardSearchPath,
} from "../src/file-recovery.mjs";

const notFound = () => ({ ok: false, status: 404 });
const found = (blob) => ({ ok: true, status: 200, blob: async () => blob });

describe("Foundry image recovery", () => {
  it("escapes percent signs only in the URL path", () => {
    expect(
      getLiteralPercentPath("worlds/test/Hwan%20Enko.webp?cache=1"),
    ).toBe("worlds/test/Hwan%2520Enko.webp?cache=1");
  });

  it("creates sibling candidates for alternate image extensions", () => {
    expect(getSiblingImagePaths("assets/C13a%20-%20Port%C3%A3o.webp")).toContain(
      "assets/C13a%20-%20Port%C3%A3o.png",
    );
  });

  it("matches relocated files by decoded basename only when unique", () => {
    const files = [
      "assets/new/IMAGEM 01 SOM SUMINDO.png",
      "assets/other/different.webp",
    ];
    expect(
      findUniqueAssetByStem(files, "assets/old/IMAGEM%2001%20SOM%20SUMINDO.png"),
    ).toBe(files[0]);
    expect(findUniqueAssetByStem([files[0], `copy/${files[0]}`], files[0])).toBeNull();
  });

  it("builds a v14 FilePicker wildcard search for a relocated basename", () => {
    expect(
      getWildcardSearchPath("assets/old/IMAGEM%2001%20SOM%20SUMINDO.png"),
    ).toBe("assets/**/IMAGEM 01 SOM SUMINDO.*");
  });

  it("recovers a literal-percent physical filename", async () => {
    const blob = new Blob(["webp"], { type: "image/webp" });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(found(blob));
    const fetchImage = createFoundryImageFetcher({ fetchFn });

    const result = await fetchImage("assets/Hwan%20Enko.webp");

    expect(fetchFn).toHaveBeenNthCalledWith(2, "assets/Hwan%2520Enko.webp");
    expect(result).toEqual({
      blob,
      sourcePath: "assets/Hwan%20Enko.webp",
      repairRequired: true,
    });
  });

  it("recovers a missing WebP from its PNG sibling", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const fetchFn = vi.fn(async (path) =>
      path.endsWith("Port%C3%A3o.png") ? found(blob) : notFound(),
    );
    const fetchImage = createFoundryImageFetcher({ fetchFn });

    const result = await fetchImage("assets/C13a%20-%20Port%C3%A3o.webp");

    expect(result.sourcePath).toBe("assets/C13a%20-%20Port%C3%A3o.png");
    expect(result.repairRequired).toBe(true);
  });

  it("marks an existing WebP sibling for reference-only replacement", async () => {
    const blob = new Blob(["webp"], { type: "image/webp" });
    const fetchFn = vi.fn(async (path) =>
      path.endsWith("portrait.webp") ? found(blob) : notFound(),
    );
    const fetchImage = createFoundryImageFetcher({ fetchFn });

    const result = await fetchImage("assets/portrait.png");

    expect(result).toMatchObject({
      sourcePath: "assets/portrait.webp",
      repairRequired: true,
      existingOptimizedPath: true,
    });
  });

  it("recovers a uniquely relocated file through FilePicker wildcard browse", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const relocated = "assets/new/IMAGEM 01 SOM SUMINDO.png";
    const fetchFn = vi.fn(async (path) =>
      path === relocated ? found(blob) : notFound(),
    );
    const browseFn = vi.fn().mockResolvedValue({ files: [relocated] });
    const fetchImage = createFoundryImageFetcher({ fetchFn, browseFn });

    const result = await fetchImage("assets/old/IMAGEM%2001%20SOM%20SUMINDO.png");

    expect(browseFn).toHaveBeenCalledWith(
      "data",
      "assets/**/IMAGEM 01 SOM SUMINDO.*",
      { wildcard: true },
    );
    expect(result).toMatchObject({ sourcePath: relocated, repairRequired: true });
  });
});
