import { compressImage, isImageFile, getWebpFilename, shouldReplace } from './compression.mjs';
import { getQuality, getOverridePercent, getAutoOptimize } from './settings.mjs';
import { resolveFoundryReference, updateReferences } from './paths.mjs';

const MODULE_ID = 'lumenn-lightweight';

export function registerUploadHook() {
  if (typeof libWrapper === 'undefined') {
    console.warn(`${MODULE_ID}: libWrapper not found. Upload hook not registered.`);
    return;
  }

  libWrapper.register(
    MODULE_ID,
    'FilePicker.prototype.upload',
    async function (wrapped, source, path, file, body, options) {
      if (!getAutoOptimize()) {
        return wrapped(source, path, file, body, options);
      }

      if (!isImageFile(file.name)) {
        return wrapped(source, path, file, body, options);
      }

      try {
        const quality = getQuality();
        const overridePercent = getOverridePercent();
        const originalSize = file.size;

        const compressed = await compressImage(file, quality);

        if (!shouldReplace(originalSize, compressed.size, overridePercent)) {
          console.log(`${MODULE_ID}: ${file.name} — compression did not reduce size enough, skipping.`);
          return wrapped(source, path, file, body, options);
        }

        const newName = getWebpFilename(file.name);
        const compressedFile = new File([compressed], newName, { type: 'image/webp' });

        const result = await wrapped(source, path, compressedFile, body, options);

        const savedPercent = ((originalSize - compressed.size) / originalSize * 100).toFixed(1);
        ui.notifications.info(
          `${MODULE_ID}: ${file.name} → ${newName} (−${savedPercent}%)`
        );

        return result;
      } catch (err) {
        console.error(`${MODULE_ID}: Compression failed for ${file.name}`, err);
        return wrapped(source, path, file, body, options);
      }
    },
    'WRAPPER'
  );
}
