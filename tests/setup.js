// Global mocks for Foundry VTT in tests

globalThis.foundry = {
  utils: {
    mergeObject: (a, b) => ({ ...a, ...b }),
  },
  applications: {
    api: {
      ApplicationV2: class ApplicationV2 {
        constructor(options) { this.options = options; }
        render() {}
        async _prepareContext(options) { return {}; }
      },
      HandlebarsApplicationMixin: (BaseClass) => class extends BaseClass {},
      DialogV2: class DialogV2 {
        static async prompt() {}
      }
    }
  }
};

globalThis.game = {
  data: { path: "/foundry/data" },
  settings: {
    _store: {},
    register: (mod, key, data) => {
      globalThis.game.settings._store[`${mod}.${key}`] = data.default;
    },
    registerMenu: () => {},
    get: (mod, key) => globalThis.game.settings._store[`${mod}.${key}`],
  },
  i18n: {
    localize: (key) => key,
  },
};

globalThis.ui = {
  notifications: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
};

globalThis.$ = () => {
  return {
    on: () => {},
    find: () => ({ last: () => ({ append: () => {} }) }),
    prop: () => ({
      find: () => ({ removeClass: () => ({ addClass: () => {} }) }),
    }),
  };
};

globalThis.Hooks = {
  on: () => {},
};

globalThis.createImageBitmap = async () => ({
  width: 100,
  height: 100,
  close: () => {},
});

globalThis.OffscreenCanvas = class {
  constructor(w, h) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return { drawImage: () => {} };
  }
  convertToBlob() {
    return Promise.resolve(new Blob(["compressed"], { type: "image/webp" }));
  }
};
