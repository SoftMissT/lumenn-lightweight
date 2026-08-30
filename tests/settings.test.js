import { describe, it, expect, beforeEach } from 'vitest';
import { registerSettings, getQuality, getOverridePercent, getAutoOptimize, getSkipExisting, SETTING_KEYS } from '../src/settings.mjs';

describe('settings', () => {
  beforeEach(() => {
    game.settings._store = {};
  });

  it('registers all settings', () => {
    registerSettings();

    expect(game.settings._store[`lumenn-lightweight.${SETTING_KEYS.QUALITY}`]).toBe(0.75);
    expect(game.settings._store[`lumenn-lightweight.${SETTING_KEYS.OVERRIDE_PERCENT}`]).toBe(25);
    expect(game.settings._store[`lumenn-lightweight.${SETTING_KEYS.AUTO_OPTIMIZE}`]).toBe(true);
    expect(game.settings._store[`lumenn-lightweight.${SETTING_KEYS.SKIP_EXISTING}`]).toBe(false);
  });

  it('getQuality returns default', () => {
    registerSettings();
    expect(getQuality()).toBe(0.75);
  });

  it('getOverridePercent returns default', () => {
    registerSettings();
    expect(getOverridePercent()).toBe(25);
  });

  it('getAutoOptimize returns default', () => {
    registerSettings();
    expect(getAutoOptimize()).toBe(true);
  });

  it('getSkipExisting returns default', () => {
    registerSettings();
    expect(getSkipExisting()).toBe(false);
  });
});
