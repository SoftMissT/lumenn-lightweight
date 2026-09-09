import { registerSettings } from "./settings.mjs";
import { registerUploadHook } from "./upload-hook.mjs";
import { openOptimizerDialog } from "./ui.mjs";

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

export function findLumennSettingsMount(root) {
  const anchor =
    root?.querySelector?.(`[name="${MODULE_ID}.skipThresholdBytes"]`) ??
    root?.querySelector?.(`[name^="${MODULE_ID}."]`);
  if (!anchor) return null;

  return (
    anchor.closest?.(`.tab[data-tab="${MODULE_ID}"]`) ??
    anchor.closest?.(`[data-tab="${MODULE_ID}"]`) ??
    anchor.closest?.(".form-group")?.parentElement ??
    null
  );
}

function addOptimizerButton(html) {
  if (!game.user?.isGM) return; // RF-003 / RF-011

  const isJQuery = typeof html?.find === "function";
  const root = isJQuery ? html[0] : html;
  if (!root || root.querySelector?.('[data-lumenn-optimizer="true"]')) return;

  const mount = findLumennSettingsMount(root);
  if (!mount) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "lumenn-settings-btn";
  button.dataset.lumennOptimizer = "true";
  button.innerHTML = `<i class="fas fa-compress-alt"></i> ${game.i18n.localize(`${MODULE_ID}.settings.button`)}`;
  button.addEventListener("click", () => openOptimizerDialog());

  const launcher = document.createElement("div");
  launcher.className = "form-group lumenn-optimizer-launcher";
  launcher.append(button);
  mount.append(launcher);
}

Hooks.on("renderSidebarTab", (app, html) => {
  if (app.options?.id !== "settings") return;
  addOptimizerButton(html);
});

Hooks.on("renderSettingsConfig", (_app, html) => {
  addOptimizerButton(html);
});
