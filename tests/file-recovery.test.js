import { describe, expect, it, vi } from "vitest";
import {
  browseFoundryTree,
  createFoundryImageFetcher,
  findUniqueAssetByStem,
  getLiteralPercentPath,
  getSiblingImagePaths,
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

  it("walks Foundry directories recursively without an unsupported globstar", async () => {
    const browseFn = vi.fn(async (_source, directory) => {
      if (directory === "assets") {
        return { dirs: ["assets/new"], files: ["assets/root.png"] };
      }
      return { dirs: [], files: ["assets/new/relocated.png"] };
    });

    await expect(browseFoundryTree("assets", browseFn)).resolves.toEqual([
      "assets/root.png",
      "assets/new/relocated.png",
    ]);
    expect(browseFn).toHaveBeenNthCalledWith(1, "data", "assets", {});
    expect(browseFn).toHaveBeenNthCalledWith(2, "data", "assets/new", {});
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

  it("republishes a literal-percent WebP instead of keeping its broken path", async () => {
    const blob = new Blob(["webp"], { type: "image/webp" });
    const fetchFn = vi.fn(async (path) =>
      path === "assets/portrait%2520one.webp" ? found(blob) : notFound(),
    );
    const fetchImage = createFoundryImageFetcher({ fetchFn });

    const result = await fetchImage("assets/portrait%20one.png");

    expect(result).toMatchObject({
      sourcePath: "assets/portrait%20one.webp",
      repairRequired: true,
      existingOptimizedPath: false,
    });
  });

  it("recovers a uniquely relocated file through recursive FilePicker browse", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const relocated = "assets/new/IMAGEM 01 SOM SUMINDO.png";
    const fetchFn = vi.fn(async (path) =>
      path === relocated ? found(blob) : notFound(),
    );
    const browseFn = vi.fn(async (_source, directory) =>
      directory === "assets"
        ? { dirs: ["assets/new"], files: [] }
        : { dirs: [], files: [relocated] },
    );
    const fetchImage = createFoundryImageFetcher({ fetchFn, browseFn });

    const result = await fetchImage("assets/old/IMAGEM%2001%20SOM%20SUMINDO.png");

    expect(browseFn).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ sourcePath: relocated, repairRequired: true });
  });

  it("reuses the recursive index for multiple missing paths in one batch", async () => {
    const first = "assets/new/first.png";
    const second = "assets/new/second.png";
    const fetchFn = vi.fn(async (path) =>
      path === first || path === second
        ? found(new Blob([path], { type: "image/png" }))
        : notFound(),
    );
    const browseFn = vi.fn().mockResolvedValue({ dirs: [], files: [first, second] });
    const fetchImage = createFoundryImageFetcher({ fetchFn, browseFn });

    await fetchImage("assets/old/first.jpg");
    await fetchImage("assets/old/second.jpg");

    expect(browseFn).toHaveBeenCalledTimes(1);
  });
});
