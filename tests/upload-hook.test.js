import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerUploadHook,
  withUploadOptimizationBypassed,
} from "../src/upload-hook.mjs";

describe("upload-hook", () => {
  beforeEach(() => {
    globalThis.game = {
      modules: { get: vi.fn() },
      user: { isGM: true },
      i18n: { localize: vi.fn() },
      settings: {
        get: vi.fn((_module, key) => {
          const values = {
            uploadHookEnabled: true,
            compressionQuality: 0.85,
            overridePercent: 0,
            skipThresholdBytes: 1000,
          };
          return values[key];
        }),
      },
    };
    globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn() } };
    globalThis.libWrapper = undefined;
    vi.clearAllMocks();
  });

  it("does not register when libWrapper is undefined or inactive", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Test 1: libWrapper undefined
    registerUploadHook();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("libWrapper not found"),
    );

    // Test 2: libWrapper exists but not active
    globalThis.libWrapper = { register: vi.fn() };
    game.modules.get.mockReturnValue({ active: false });
    registerUploadHook();
    expect(libWrapper.register).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("registers hook when libWrapper is available and active", () => {
    globalThis.libWrapper = { register: vi.fn() };
    game.modules.get.mockReturnValue({ active: true });

    registerUploadHook();

    expect(libWrapper.register).toHaveBeenCalledWith(
      "lumenn-lightweight",
      "FilePicker.upload",
      expect.any(Function),
      "WRAPPER",
    );
  });

  it("passes an uploaded WebP through unchanged regardless of size", async () => {
    globalThis.libWrapper = { register: vi.fn() };
    game.modules.get.mockReturnValue({ active: true });
    registerUploadHook();

    const wrapper = libWrapper.register.mock.calls[0][2];
    const wrapped = vi.fn().mockResolvedValue({ path: "uploads/large.webp" });
    const file = new File([new Uint8Array(10000)], "large.webp", {
      type: "image/webp",
    });

    await wrapper(wrapped, "data", "uploads", file, {}, {});

    const uploadedFile = wrapped.mock.calls[0][2];
    expect(uploadedFile).toBe(file);
    expect(ui.notifications.info).not.toHaveBeenCalled();
  });

  it("bypasses recompression and notifications for internal batch uploads", async () => {
    globalThis.libWrapper = { register: vi.fn() };
    game.modules.get.mockReturnValue({ active: true });
    registerUploadHook();

    const wrapper = libWrapper.register.mock.calls[0][2];
    const wrapped = vi.fn().mockResolvedValue({ path: "uploads/batch.webp" });
    const file = new File([new Uint8Array(10000)], "batch.webp", {
      type: "image/webp",
    });

    await withUploadOptimizationBypassed(() =>
      wrapper(wrapped, "data", "uploads", file, {}, {}),
    );

    expect(wrapped).toHaveBeenCalledWith("data", "uploads", file, {}, {});
    expect(ui.notifications.info).not.toHaveBeenCalled();
  });
});
