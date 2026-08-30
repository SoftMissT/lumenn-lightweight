import { describe, it, expect } from 'vitest';
import { isImageFile, getWebpFilename, shouldReplace } from '../src/compression.mjs';

describe('isImageFile', () => {
  it('returns true for PNG files', () => {
    expect(isImageFile('photo.png')).toBe(true);
  });

  it('returns true for JPG files', () => {
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
  });

  it('returns true for WebP files', () => {
    expect(isImageFile('photo.webp')).toBe(true);
  });

  it('returns false for non-image files', () => {
    expect(isImageFile('document.pdf')).toBe(false);
    expect(isImageFile('script.js')).toBe(false);
    expect(isImageFile('data.json')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isImageFile('photo.PNG')).toBe(true);
    expect(isImageFile('photo.JPG')).toBe(true);
  });
});

describe('getWebpFilename', () => {
  it('converts PNG to WebP', () => {
    expect(getWebpFilename('image.png')).toBe('image.webp');
  });

  it('converts JPG to WebP', () => {
    expect(getWebpFilename('image.jpg')).toBe('image.webp');
  });

  it('keeps WebP as WebP', () => {
    expect(getWebpFilename('image.webp')).toBe('image.webp');
  });

  it('handles filenames with multiple dots', () => {
    expect(getWebpFilename('my.photo.v2.png')).toBe('my.photo.v2.webp');
  });
});

describe('shouldReplace', () => {
  it('returns true when savings exceed threshold', () => {
    expect(shouldReplace(1000, 500, 25)).toBe(true);
  });

  it('returns false when savings are below threshold', () => {
    expect(shouldReplace(1000, 900, 25)).toBe(false);
  });

  it('returns false when original size is zero', () => {
    expect(shouldReplace(0, 0, 25)).toBe(false);
  });

  it('returns true when threshold is 0', () => {
    expect(shouldReplace(1000, 999, 0)).toBe(true);
  });

  it('returns true when new file is larger (negative savings)', () => {
    expect(shouldReplace(100, 200, 25)).toBe(false);
  });
});
