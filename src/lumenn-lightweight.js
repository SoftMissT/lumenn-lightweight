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

function addOptimizerButton(html) {
  if (!game.user?.isGM) return; // RF-003 / RF-011

  const isJQuery = typeof html?.find === "function";
  const root = isJQuery ? html[0] : html;
  const existing = isJQuery
    ? html.find('[data-lumenn-optimizer="true"]')
    : root?.querySelector?.('[data-lumenn-optimizer="true"]');
  const hasExisting = isJQuery ? existing.length > 0 : Boolean(existing);
  if (hasExisting) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "lumenn-settings-btn";
  button.dataset.lumennOptimizer = "true";
  button.innerHTML = `<i class="fas fa-compress-alt"></i> ${game.i18n.localize(`${MODULE_ID}.settings.button`)}`;
  button.addEventListener("click", () => openOptimizerDialog());

  if (isJQuery) {
    const sections = html.find(".settings-section");
    if (sections.length) sections.last().append(button);
    else html.append(button);
    return;
  }

  const section = root?.querySelector?.(".settings-section:last-of-type");
  (section || root)?.append(button);
}

Hooks.on("renderSidebarTab", (app, html) => {
  if (app.options?.id !== "settings") return;
  addOptimizerButton(html);
});

Hooks.on("renderSettingsConfig", (_app, html) => {
  addOptimizerButton(html);
});
