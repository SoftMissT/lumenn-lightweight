import { getQuality, getOverridePercent, getAutoOptimize, getSkipExisting } from './settings.mjs';
import { optimizeDirectory } from './batch.mjs';

const MODULE_ID = 'lumenn-lightweight';

export function openOptimizerDialog() {
  const currentQuality = getQuality();
  const currentOverride = getOverridePercent();
  const currentAutoOptimize = getAutoOptimize();
  const currentSkipExisting = getSkipExisting();

  const content = `
    <form class="lumenn-form">
      <div class="form-group">
        <label for="lumenn-quality">${game.i18n.localize(`${MODULE_ID}.dialog.quality`)}</label>
        <input type="range" id="lumenn-quality" name="quality"
               min="0.1" max="1.0" step="0.05" value="${currentQuality}">
        <span class="range-value">${currentQuality}</span>
      </div>

      <div class="form-group">
        <label for="lumenn-override">${game.i18n.localize(`${MODULE_ID}.dialog.overridePercent`)}</label>
        <input type="range" id="lumenn-override" name="overridePercent"
               min="0" max="90" step="5" value="${currentOverride}">
        <span class="range-value">${currentOverride}%</span>
      </div>

      <div class="form-group checkbox">
        <input type="checkbox" id="lumenn-auto" name="autoOptimize"
               ${currentAutoOptimize ? 'checked' : ''}>
        <label for="lumenn-auto">${game.i18n.localize(`${MODULE_ID}.dialog.autoOptimize`)}</label>
      </div>

      <div class="form-group checkbox">
        <input type="checkbox" id="lumenn-skip" name="skipExisting"
               ${currentSkipExisting ? 'checked' : ''}>
        <label for="lumenn-skip">${game.i18n.localize(`${MODULE_ID}.dialog.skipExisting`)}</label>
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
    default: 'close',
    render: (html) => {
      _bindRangeInputs(html);
      _bindBatchButton(html);
    },
  }).render(true);
}

function _bindRangeInputs(html) {
  html.find('input[type="range"]').on('input', function () {
    const value = $(this).val();
    const suffix = $(this).attr('name') === 'overridePercent' ? '%' : '';
    $(this).siblings('.range-value').text(`${value}${suffix}`);
  });
}

function _bindBatchButton(html) {
  html.find('.lumenn-batch-btn').on('click', async function () {
    const btn = $(this);
    btn.prop('disabled', true).find('i').removeClass('fa-compress-alt').addClass('fa-spinner fa-spin');

    const progressDiv = html.find('.lumenn-progress');
    const progressFill = html.find('.progress-fill');
    const progressText = html.find('.progress-text');

    progressDiv.show();

    try {
      const dataPath = game.data?.path;
      if (!dataPath) {
        ui.notifications.error(`${MODULE_ID}: Could not determine Foundry data path.`);
        return;
      }

      const results = await optimizeDirectory(dataPath, {
        recursive: false,
        onProgress: ({ file, optimized, total }) => {
          const percent = Math.round((optimized / total) * 100);
          progressFill.css('width', `${percent}%`);
          progressText.text(`${optimized}/${total}: ${file}`);
        },
      });

      const savedKB = (results.bytesSaved / 1024).toFixed(1);
      ui.notifications.info(
        `${MODULE_ID}: Done! ${results.optimized} optimized, ${results.skipped} skipped, ${savedKB} KB saved.`
      );
    } catch (err) {
      console.error(`${MODULE_ID}: Batch optimization failed`, err);
      ui.notifications.error(`${MODULE_ID}: Batch optimization failed. Check console.`);
    } finally {
      btn.prop('disabled', false).find('i').removeClass('fa-spinner fa-spin').addClass('fa-compress-alt');
      progressDiv.hide();
    }
  });
}
