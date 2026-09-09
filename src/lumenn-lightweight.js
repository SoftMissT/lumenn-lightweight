import { registerSettings } from "./settings.mjs";
import { registerUploadHook } from "./upload-hook.mjs";
import { LumennBatchMenuApp, openOptimizerDialog } from "./ui.mjs";
import { runAutomaticReferenceRepair } from "./automatic-repair.mjs";

const MODULE_ID = "lumenn-lightweight";

Hooks.on("init", () => {
  registerSettings(LumennBatchMenuApp);

  game.modules.get(MODULE_ID).api = {
    openOptimizerDialog,
  };

  console.log(`${MODULE_ID}: Initialized.`);
});

Hooks.on("ready", async () => {
  registerUploadHook();
  console.log(`${MODULE_ID}: Upload hook registered.`);
  try {
    await runAutomaticReferenceRepair();
  } catch (error) {
    console.error(`${MODULE_ID}: Reconciliação automática falhou`, error);
  }
});
