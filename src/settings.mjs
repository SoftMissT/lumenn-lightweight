const MODULE_ID = 'lumenn-lightweight';

export const SETTING_KEYS = {
  QUALITY: 'quality',
  OVERRIDE_PERCENT: 'overridePercent',
  AUTO_OPTIMIZE: 'autoOptimize',
  SKIP_EXISTING: 'skipExisting',
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTING_KEYS.QUALITY, {
    name: `${MODULE_ID}.settings.quality.name`,
    hint: `${MODULE_ID}.settings.quality.hint`,
    scope: 'world',
    config: true,
    type: Number,
    default: 0.75,
    range: {
      min: 0.1,
      max: 1.0,
      step: 0.05,
    },
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.OVERRIDE_PERCENT, {
    name: `${MODULE_ID}.settings.overridePercent.name`,
    hint: `${MODULE_ID}.settings.overridePercent.hint`,
    scope: 'world',
    config: true,
    type: Number,
    default: 25,
    range: {
      min: 0,
      max: 90,
      step: 5,
    },
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.AUTO_OPTIMIZE, {
    name: `${MODULE_ID}.settings.autoOptimize.name`,
    hint: `${MODULE_ID}.settings.autoOptimize.hint`,
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.SKIP_EXISTING, {
    name: `${MODULE_ID}.settings.skipExisting.name`,
    hint: `${MODULE_ID}.settings.skipExisting.hint`,
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });
}

export function getQuality() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.QUALITY);
}

export function getOverridePercent() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.OVERRIDE_PERCENT);
}

export function getAutoOptimize() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.AUTO_OPTIMIZE);
}

export function getSkipExisting() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.SKIP_EXISTING);
}
