import { getQuality, getOverridePercent, getSkipThresholdBytes } from './settings.mjs';
import { processBatch } from './batch.mjs';
import { scanUnoptimizedAssets } from './scanner.mjs';
import { getWebpFilename } from './compression.mjs';

const MODULE_ID = 'lumenn-lightweight';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LumennBatchMenuApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options={}) {
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
      resizable: true
    },
    position: {
      width: 500,
      height: "auto"
    },
    actions: {
      optimize: LumennBatchMenuApp.#onOptimize
    }
  };

  static PARTS = {
    content: {
      template: "modules/lumenn-lightweight/templates/batch-menu.hbs",
      scrollable: [".lumenn-asset-list"]
    }
  };

  get title() {
    return game.i18n.localize(this.options.window.title);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    const collections = { actors: game.actors, items: game.items, scenes: game.scenes };
    const threshold = getSkipThresholdBytes();
    
    this.assets = scanUnoptimizedAssets(collections, threshold);

    context.assets = this.assets;
    context.currentQuality = getQuality();
    
    return context;
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
    const checkboxes = Array.from(appElement.querySelectorAll('input[name="assets"]:checked'));
    const selectedIndices = checkboxes.map(cb => parseInt(cb.value, 10));

    if (selectedIndices.length === 0) {
      ui.notifications.warn(`${MODULE_ID}: Nenhum asset selecionado.`);
      return;
    }

    const selectedAssets = this.assets.filter((_, i) => selectedIndices.includes(i));

    // UI state loading
    target.disabled = true;
    icon.classList.remove('fa-compress-alt');
    icon.classList.add('fa-spinner', 'fa-spin');
    progressDiv.style.display = "block";

    try {
      const results = await processBatch(selectedAssets, {
        quality: getQuality(),
        overridePercent: getOverridePercent(),
        skipThresholdBytes: getSkipThresholdBytes(),
        fetchImageFn: async (path) => {
          const res = await fetch(path);
          if (!res.ok) throw new Error(`Falha ao ler ${path}: HTTP ${res.status}`);
          return await res.blob();
        },
        saveImageFn: async (path, compressedBlob) => {
          const filename = path.split('/').pop();
          const webpName = getWebpFilename(filename);
          const file = new File([compressedBlob], webpName, { type: 'image/webp' });
          
          const pathParts = path.split('/');
          pathParts.pop();
          const targetPath = pathParts.join('/');
          
          const uploadRes = await FilePicker.upload("data", targetPath, file, {}, {});
          const uploadedPath = uploadRes?.path ?? uploadRes;
          if (typeof uploadedPath !== "string" || !uploadedPath) {
            throw new Error("FilePicker.upload não retornou um caminho válido");
          }
          return uploadedPath;
        },
        updateDocumentFn: async (asset, newPath) => {
          let collection;
          if (asset.type.includes('Actor')) collection = game.actors;
          else if (asset.type.includes('Item')) collection = game.items;
          else if (asset.type.includes('Scene')) collection = game.scenes;

          const doc = collection.get(asset.id);
          if (doc) {
            if (asset.type === 'Scene Background') await doc.update({ "background.src": newPath });
            else if (asset.type === 'Scene Foreground') await doc.update({ foreground: newPath });
            else if (asset.type === 'Actor Token') await doc.update({ "prototypeToken.texture.src": newPath });
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
        `${MODULE_ID}: Concluído! ${results.processed} processados, ${results.skipped} pulados.`
      );
      if (results.failed.length > 0) {
        ui.notifications.error(`${MODULE_ID}: ${results.failed.length} falharam. Verifique o console.`);
      }
    } catch (err) {
      console.error(`${MODULE_ID}: Lote falhou`, err);
      ui.notifications.error(`${MODULE_ID}: Falha catastrófica no lote.`);
    } finally {
      target.disabled = false;
      icon.classList.add('fa-compress-alt');
      icon.classList.remove('fa-spinner', 'fa-spin');
      setTimeout(() => progressDiv.style.display = "none", 2000);
    }
  }
}

export async function openOptimizerDialog() {
  if (!game.user?.isGM) return;
  new LumennBatchMenuApp().render(true);
}
