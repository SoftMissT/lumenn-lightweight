import {
  getQuality,
  getOverridePercent,
  getSkipThresholdBytes,
} from "./settings.mjs";
import { processBatch } from "./batch.mjs";
import { scanUnoptimizedAssets } from "./scanner.mjs";
import { decodeFoundryFilename, getWebpFilename } from "./compression.mjs";

const MODULE_ID = "lumenn-lightweight";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const ASSET_GROUPS = [
  { key: "portraits", type: "Actor", icon: "fa-solid fa-user" },
  { key: "tokens", type: "Actor Token", icon: "fa-solid fa-chess-pawn" },
  { key: "items", type: "Item", icon: "fa-solid fa-suitcase" },
  { key: "sceneBackgrounds", type: "Scene Background", icon: "fa-solid fa-image" },
  { key: "sceneForegrounds", type: "Scene Foreground", icon: "fa-solid fa-layer-group" },
];

export function getLiteralPercentPath(path) {
  if (typeof path !== "string" || !/%[0-9a-f]{2}/i.test(path)) return null;
  const hashIndex = path.indexOf("#");
  const queryIndex = path.indexOf("?");
  const suffixIndex = [hashIndex, queryIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? path.length;
  return `${path.slice(0, suffixIndex).replaceAll("%", "%25")}${path.slice(suffixIndex)}`;
}

export async function fetchFoundryImage(path, fetchFn = fetch) {
  const response = await fetchFn(path);
  if (response.ok) {
    return { blob: await response.blob(), repairRequired: false };
  }

  const recoveryPath = getLiteralPercentPath(path);
  if (response.status === 404 && recoveryPath) {
    const recoveryResponse = await fetchFn(recoveryPath);
    if (recoveryResponse.ok) {
      return { blob: await recoveryResponse.blob(), repairRequired: true };
    }
  }

  throw new Error(`Falha ao ler ${path}: HTTP ${response.status}`);
}

export function groupAssetsByKind(assets, localize = (key) => key) {
  const indexedAssets = assets.map((asset, index) => ({ ...asset, index }));
  const groups = ASSET_GROUPS.map((definition) => {
    const groupedAssets = indexedAssets.filter(
      (asset) => asset.type === definition.type,
    );
    return {
      ...definition,
      label: localize(`${MODULE_ID}.dialog.groups.${definition.key}`),
      count: groupedAssets.length,
      assets: groupedAssets,
      active: false,
    };
  });

  const firstAvailable = groups.find((group) => group.count > 0);
  if (firstAvailable) firstAvailable.active = true;
  return groups;
}

export class LumennBatchMenuApp extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(options = {}) {
    super(options);
    this.assets = [];
  }

  static DEFAULT_OPTIONS = {
    id: "lumenn-batch-menu",
    classes: ["lumenn-form"],
    tag: "form",
    window: {
      title: `${MODULE_ID}.dialog.title`,
      icon: "fas fa-compress-alt",
      resizable: true,
    },
    position: {
      width: 680,
      height: 620,
    },
    actions: {
      optimize: LumennBatchMenuApp.#onOptimize,
      filterGroup: LumennBatchMenuApp.#onFilterGroup,
      selectGroup: LumennBatchMenuApp.#onSelectGroup,
      clearGroup: LumennBatchMenuApp.#onClearGroup,
    },
  };

  static PARTS = {
    content: {
      template: "modules/lumenn-lightweight/templates/batch-menu.hbs",
      scrollable: [".lumenn-asset-list"],
    },
  };

  get title() {
    return game.i18n.localize(this.options.window.title);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const collections = {
      actors: game.actors,
      items: game.items,
      scenes: game.scenes,
    };
    const threshold = getSkipThresholdBytes();

    this.assets = scanUnoptimizedAssets(collections, threshold);

    context.assets = this.assets;
    context.groups = groupAssetsByKind(this.assets, (key) =>
      game.i18n.localize(key),
    );
    context.currentQuality = getQuality();
    context.qualityPercent = Math.round(getQuality() * 100);

    return context;
  }

  static #onFilterGroup(_event, target) {
    const appElement = target.closest(".lumenn-form");
    const group = target.dataset.group;

    for (const tab of appElement.querySelectorAll(".lumenn-category-tab")) {
      const active = tab.dataset.group === group;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    }

    for (const panel of appElement.querySelectorAll(".lumenn-group-panel")) {
      panel.hidden = panel.dataset.group !== group;
    }
  }

  static #setGroupSelection(target, checked) {
    const appElement = target.closest(".lumenn-form");
    const group = target.dataset.group;
    const panel = appElement.querySelector(
      `.lumenn-group-panel[data-group="${group}"]`,
    );
    if (!panel) return;

    for (const checkbox of panel.querySelectorAll('input[name="assets"]')) {
      checkbox.checked = checked;
    }
  }

  static #onSelectGroup(_event, target) {
    LumennBatchMenuApp.#setGroupSelection(target, true);
  }

  static #onClearGroup(_event, target) {
    LumennBatchMenuApp.#setGroupSelection(target, false);
  }

  static async #onOptimize(event, target) {
    if (!game.user?.isGM) return;

    // Acessa a instância app através de target.closest()
    const appElement = target.closest(".lumenn-form");
    const progressDiv = appElement.querySelector(".lumenn-progress");
    const progressFill = progressDiv.querySelector(".progress-fill");
    const progressText = progressDiv.querySelector(".progress-text");
    const icon = target.querySelector("i");

    // Extrai checkboxes selecionados nativamente no DOM
    const checkboxes = Array.from(
      appElement.querySelectorAll('input[name="assets"]:checked'),
    );
    const selectedIndices = checkboxes.map((cb) => parseInt(cb.value, 10));

    if (selectedIndices.length === 0) {
      ui.notifications.warn(`${MODULE_ID}: Nenhum asset selecionado.`);
      return;
    }

    const selectedAssets = this.assets.filter((_, i) =>
      selectedIndices.includes(i),
    );

    // UI state loading
    target.disabled = true;
    icon.classList.remove("fa-compress-alt");
    icon.classList.add("fa-spinner", "fa-spin");
    progressDiv.hidden = false;

    try {
      const results = await processBatch(selectedAssets, {
        quality: getQuality(),
        overridePercent: getOverridePercent(),
        skipThresholdBytes: getSkipThresholdBytes(),
        fetchImageFn: fetchFoundryImage,
        saveImageFn: async (path, compressedBlob) => {
          const encodedFilename = path.split("/").pop();
          const filename = decodeFoundryFilename(encodedFilename);
          const webpName = getWebpFilename(filename);
          const file = new File([compressedBlob], webpName, {
            type: "image/webp",
          });

          const pathParts = path.split("/");
          pathParts.pop();
          const targetPath = pathParts.join("/");

          const uploadRes = await FilePicker.upload(
            "data",
            targetPath,
            file,
            {},
            {},
          );
          const uploadedPath = uploadRes?.path ?? uploadRes;
          if (typeof uploadedPath !== "string" || !uploadedPath) {
            throw new Error("FilePicker.upload não retornou um caminho válido");
          }
          return uploadedPath;
        },
        updateDocumentFn: async (asset, newPath) => {
          let collection;
          if (asset.type.includes("Actor")) collection = game.actors;
          else if (asset.type.includes("Item")) collection = game.items;
          else if (asset.type.includes("Scene")) collection = game.scenes;

          const doc = collection.get(asset.id);
          if (doc) {
            if (asset.type === "Scene Background")
              await doc.update({ "background.src": newPath });
            else if (asset.type === "Scene Foreground")
              await doc.update({ foreground: newPath });
            else if (asset.type === "Actor Token")
              await doc.update({ "prototypeToken.texture.src": newPath });
            else await doc.update({ img: newPath });
          }
        },
        onProgress: ({ done, total, current }) => {
          const percent = Math.round((done / total) * 100);
          progressFill.style.width = `${percent}%`;
          progressText.innerText = `${done}/${total}: ${current}`;
        },
      });

      ui.notifications.info(
        `${MODULE_ID}: Concluído! ${results.processed} processados (${results.repaired} referências reparadas), ${results.skipped} pulados.`,
      );
      if (results.failed.length > 0) {
        ui.notifications.error(
          `${MODULE_ID}: ${results.failed.length} falharam. Verifique o console.`,
        );
      }
    } catch (err) {
      console.error(`${MODULE_ID}: Lote falhou`, err);
      ui.notifications.error(`${MODULE_ID}: Falha catastrófica no lote.`);
    } finally {
      target.disabled = false;
      icon.classList.add("fa-compress-alt");
      icon.classList.remove("fa-spinner", "fa-spin");
      setTimeout(() => (progressDiv.hidden = true), 2000);
    }
  }
}

export async function openOptimizerDialog() {
  if (!game.user?.isGM) return;
  new LumennBatchMenuApp().render(true);
}
