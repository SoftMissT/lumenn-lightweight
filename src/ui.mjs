import {
  getQuality,
  getOverridePercent,
  getSkipThresholdBytes,
} from "./settings.mjs";
import { processBatch } from "./batch.mjs";
import { scanUnoptimizedAssets } from "./scanner.mjs";

const MODULE_ID = "lumenn-lightweight";

export class LumennBatchMenuApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "lumenn-batch-menu",
      title: game.i18n.localize(`${MODULE_ID}.dialog.title`),
      template: "modules/lumenn-lightweight/templates/batch-menu.html",
      width: 500,
      height: "auto",
      closeOnSubmit: false,
    });
  }

  // Se nÃ£o formos usar um template HBS externo (por nÃ£o ter na spec um arquivo HTML),
  // podemos renderizar via openOptimizerDialog manual ou reescrever render() aqui
  render(force = false, options = {}) {
    openOptimizerDialog();
    return this;
  }
}

export async function openOptimizerDialog() {
  if (!game.user?.isGM) return;

  const currentQuality = getQuality();
  const currentOverride = getOverridePercent();
  const threshold = getSkipThresholdBytes();

  // Scan unoptimized assets (RF-006)
  ui.notifications.info(`${MODULE_ID}: Verificando assets...`);
  const collections = {
    actors: game.actors,
    items: game.items,
    scenes: game.scenes,
  };
  const assets = scanUnoptimizedAssets(collections, threshold);

  if (assets.length === 0) {
    ui.notifications.info(
      `${MODULE_ID}: Nenhum asset precisando de otimização encontrado!`,
    );
    return;
  }

  const listHtml = assets
    .map(
      (a, i) => `
    <div class="checkbox" style="margin-bottom: 4px;">
      <input type="checkbox" id="l_asset_${i}" value="${i}" checked>
      <label for="l_asset_${i}" title="${a.imgPath}">${a.type} - ${a.name}</label>
    </div>
  `,
    )
    .join("");

  const content = `
    <form class="lumenn-form">
      <p>Foram encontrados ${assets.length} assets para compressão (Qualidade atual: ${currentQuality}).</p>
      
      <div style="max-height: 200px; overflow-y: auto; border: 1px solid #333; padding: 5px; margin-bottom: 10px;">
        ${listHtml}
      </div>

      <div class="form-group">
        <button type="button" class="lumenn-batch-btn">
          <i class="fas fa-compress-alt"></i>
          ${game.i18n.localize(`${MODULE_ID}.dialog.batchOptimize`)}
        </button>
      </div>

      <div class="lumenn-progress" style="display:none;">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <span class="progress-text"></span>
      </div>
    </form>
  `;

  new Dialog({
    title: game.i18n.localize(`${MODULE_ID}.dialog.title`),
    content,
    buttons: {
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize(`${MODULE_ID}.dialog.close`),
      },
    },
    default: "close",
    render: (html) => {
      _bindBatchButton(html, assets);
    },
  }).render(true);
}

function _bindBatchButton(html, fullAssetsList) {
  html.find(".lumenn-batch-btn").on("click", async function () {
    const btn = $(this);
    btn
      .prop("disabled", true)
      .find("i")
      .removeClass("fa-compress-alt")
      .addClass("fa-spinner fa-spin");

    const progressDiv = html.find(".lumenn-progress");
    const progressFill = html.find(".progress-fill");
    const progressText = html.find(".progress-text");

    progressDiv.show();

    // Get selected indices
    const selectedIndices = [];
    html.find('input[type="checkbox"]:checked').each(function () {
      selectedIndices.push(parseInt($(this).val()));
    });

    const selectedAssets = fullAssetsList.filter((_, i) =>
      selectedIndices.includes(i),
    );

    if (selectedAssets.length === 0) {
      ui.notifications.warn(`${MODULE_ID}: Nenhum asset selecionado.`);
      btn
        .prop("disabled", false)
        .find("i")
        .removeClass("fa-spinner fa-spin")
        .addClass("fa-compress-alt");
      progressDiv.hide();
      return;
    }

    try {
      const results = await processBatch(selectedAssets, {
        quality: getQuality(),
        overridePercent: getOverridePercent(),
        skipThresholdBytes: getSkipThresholdBytes(),
        fetchImageFn: async (path) => {
          const res = await fetch(path);
          return await res.blob();
        },
        saveImageFn: async (path, compressedBlob) => {
          // FilePicker.upload mock implementation logic for saving
          const filename = path.split("/").pop();
          const webpName = filename.split(".")[0] + ".webp";
          const file = new File([compressedBlob], webpName, {
            type: "image/webp",
          });

          // Identify source and dir
          const pathParts = path.split("/");
          pathParts.pop();
          let targetPath = pathParts.join("/");
          if (!targetPath) targetPath = "assets";

          const uploadRes = await FilePicker.upload(
            "data",
            targetPath,
            file,
            {},
            {},
          );
          return uploadRes.path;
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
          progressFill.css("width", `${percent}%`);
          progressText.text(`${done}/${total}: ${current}`);
        },
      });

      ui.notifications.info(
        `${MODULE_ID}: Concluído! ${results.processed} processados, ${results.skipped} pulados.`,
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
      btn
        .prop("disabled", false)
        .find("i")
        .removeClass("fa-spinner fa-spin")
        .addClass("fa-compress-alt");
      setTimeout(() => progressDiv.hide(), 2000);
    }
  });
}
