import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUploadHook } from "../src/upload-hook.mjs";

describe("upload-hook", () => {
  beforeEach(() => {
    globalThis.game = {
      modules: { get: vi.fn() },
      user: { isGM: true },
      i18n: { localize: vi.fn() },
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
});
