import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUploadHook } from '../src/upload-hook.mjs';
import { registerSettings } from '../src/settings.mjs';

describe('upload-hook', () => {
  beforeEach(() => {
    game.settings._store = {};
    registerSettings();
  });

  it('does not register when libWrapper is undefined', () => {
    globalThis.libWrapper = undefined;
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerUploadHook();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('libWrapper not found')
    );
    consoleSpy.mockRestore();
  });

  it('registers hook when libWrapper is available', () => {
    let registeredName = null;
    let registeredTarget = null;

    globalThis.libWrapper = {
      register: (name, target, fn, type) => {
        registeredName = name;
        registeredTarget = target;
      },
    };

    registerUploadHook();

    expect(registeredName).toBe('lumenn-lightweight');
    expect(registeredTarget).toBe('FilePicker.prototype.upload');
  });
});
