const MODULE_ID = "lumenn-lightweight";

export function registerSettings(menuType) {
  if (!menuType) {
    throw new TypeError("registerSettings requires a batch menu Application class");
  }

  game.settings.registerMenu(MODULE_ID, "batchMenu", {
    name: `${MODULE_ID}.settings.batchMenu.name`,
    label: `${MODULE_ID}.settings.batchMenu.label`,
    hint: `${MODULE_ID}.settings.batchMenu.hint`,
    icon: "fas fa-compress-alt",
    type: menuType,
    restricted: true,
  });

  // Alias de backward compatibility ou novas chaves
  game.settings.register(MODULE_ID, "uploadHookEnabled", {
    name: `${MODULE_ID}.settings.autoOptimize.name`,
    hint: `${MODULE_ID}.settings.autoOptimize.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "compressionQuality", {
    name: `${MODULE_ID}.settings.quality.name`,
    hint: `${MODULE_ID}.settings.quality.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0.1, max: 1.0, step: 0.05 },
    default: 0.85,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "overridePercent", {
    name: `${MODULE_ID}.settings.overridePercent.name`,
    hint: `${MODULE_ID}.settings.overridePercent.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 90, step: 5 },
    default: 25,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "skipThresholdBytes", {
    name: `${MODULE_ID}.settings.skipExisting.name`, // Reaproveitando chave i18n
    hint: `${MODULE_ID}.settings.skipExisting.hint`,
    scope: "world",
    config: false,
    type: Number,
    default: 102400, // 100KB
    restricted: true,
  });

  game.settings.register(MODULE_ID, "lastReferenceRepairVersion", {
    scope: "world",
    config: false,
    type: String,
    default: "",
    restricted: true,
  });

  // Alias settings for backward compatibility if needed, or we just map old getter functions to new keys
}

export function getUploadHookEnabled() {
  return game.settings.get(MODULE_ID, "uploadHookEnabled");
}

export function getAutoOptimize() {
  // backward compat alias
  return getUploadHookEnabled();
}

export function getQuality() {
  return game.settings.get(MODULE_ID, "compressionQuality");
}

export function getOverridePercent() {
  return game.settings.get(MODULE_ID, "overridePercent");
}

export function getSkipThresholdBytes() {
  return game.settings.get(MODULE_ID, "skipThresholdBytes");
}

export function getSkipExisting() {
  // backward compat alias
  return getSkipThresholdBytes() > 0;
}
