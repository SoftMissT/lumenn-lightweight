import { registerSettings } from "./settings.mjs";
import { registerUploadHook } from "./upload-hook.mjs";
import { openOptimizerDialog, LumennBatchMenuApp } from "./ui.mjs";

const MODULE_ID = "lumenn-lightweight";

Hooks.on("init", () => {
  registerSettings();

  game.modules.get(MODULE_ID).api = {
    openOptimizerDialog,
  };

  console.log(`${MODULE_ID}: Initialized.`);
});

Hooks.on("ready", () => {
  registerUploadHook();
  console.log(`${MODULE_ID}: Upload hook registered.`);
});

Hooks.on("renderSidebarTab", (app, html) => {
  if (app.options.id !== "settings") return;
  if (!game.user?.isGM) return; // RF-003 / RF-011

  const button = $(`
    <button class="lumenn-settings-btn" data-action="lumenn-optimizer">
      <i class="fas fa-compress-alt"></i> ${game.i18n.localize(`${MODULE_ID}.settings.button`)}
    </button>
  `);

  button.on("click", () => openOptimizerDialog());
  html.find(".settings-section").last().append(button);
});
