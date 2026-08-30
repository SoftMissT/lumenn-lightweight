import { describe, it, expect } from 'vitest';
import { resolveFoundryReference } from '../src/paths.mjs';

describe('resolveFoundryReference', () => {
  it('resolves a path within Foundry data', () => {
    const result = resolveFoundryReference('/foundry/data/modules/my-module/icon.png');
    expect(result).toBe('modules/my-module/icon.png');
  });

  it('returns null for path outside Foundry data', () => {
    const result = resolveFoundryReference('/etc/passwd');
    expect(result).toBeNull();
  });

  it('handles paths with backslashes', () => {
    const result = resolveFoundryReference('/foundry/data/worlds\\my-world\\map.webp');
    expect(result).toBe('worlds\\my-world\\map.webp');
  });
});
