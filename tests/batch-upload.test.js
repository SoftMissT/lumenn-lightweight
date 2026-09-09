import { describe, expect, it, vi } from "vitest";
import { uploadBatchImage } from "../src/batch-upload.mjs";

describe("batch image upload", () => {
  it("silences Foundry's per-file notification and returns the saved path", async () => {
    const uploadFn = vi.fn().mockResolvedValue({
      path: "assets/portraits/Hwan Enko.webp",
    });

    const result = await uploadBatchImage(
      "assets/portraits/Hwan%20Enko.png",
      new Blob(["webp"], { type: "image/webp" }),
      uploadFn,
    );

    expect(result).toBe("assets/portraits/Hwan Enko.webp");
    expect(uploadFn).toHaveBeenCalledTimes(1);
    const [source, targetPath, file, body, options] = uploadFn.mock.calls[0];
    expect(source).toBe("data");
    expect(targetPath).toBe("assets/portraits");
    expect(file.name).toBe("Hwan Enko.webp");
    expect(body).toEqual({});
    expect(options).toEqual({ notify: false });
  });
});
