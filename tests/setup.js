import { vi } from 'vitest';

globalThis.game = {
  data: { path: '/foundry/data' },
  settings: {
    _store: {},
    register(moduleId, key, config) {
      this._store[`${moduleId}.${key}`] = config.default;
    },
    get(moduleId, key) {
      return this._store[`${moduleId}.${key}`];
    },
    set(moduleId, key, value) {
      this._store[`${moduleId}.${key}`] = value;
    },
  },
  modules: {
    get: (id) => ({
      api: {},
      active: true,
    }),
  },
  i18n: {
    localize: (key) => key,
  },
  packs: new Map(),
};

globalThis.Hooks = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  once(event, fn) {
    this.on(event, fn);
  },
  callAll(event, ...args) {
    (this._listeners[event] || []).forEach((fn) => fn(...args));
  },
};

globalThis.ui = {
  notifications: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};

globalThis.libWrapper = undefined;

globalThis.OffscreenCanvas = class OffscreenCanvas {
  constructor(w, h) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return {
      drawImage: vi.fn(),
      toDataURL: (type, quality) => {
        const data = '/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiA==';
        return `data:${type};${data}`;
      },
    };
  }
};

globalThis.createImageBitmap = vi.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: vi.fn(),
});

globalThis.atob = (str) => Buffer.from(str, 'base64').toString('binary');

globalThis.Blob = globalThis.Blob || class Blob {
  constructor(parts, options) {
    this._buffer = Buffer.concat(parts.map(p =>
      Buffer.isBuffer(p) ? p : Buffer.from(p)
    ));
    this.type = options?.type || '';
    this.size = this._buffer.length;
  }
  async arrayBuffer() {
    return this._buffer.buffer;
  }
};
