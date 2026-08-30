import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSettings, SETTING_KEYS } from '../src/settings.mjs';

describe('batch', () => {
  beforeEach(() => {
    game.settings._store = {};
    registerSettings();
  });

  it('SUPPORTED_EXTENSIONS are correct', async () => {
    const { isImageFile } = await import('../src/compression.mjs');

    expect(isImageFile('photo.png')).toBe(true);
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
    expect(isImageFile('photo.webp')).toBe(true);
    expect(isImageFile('photo.bmp')).toBe(false);
    expect(isImageFile('photo.gif')).toBe(false);
  });
});
