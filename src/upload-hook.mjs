import {
  compressImage,
  isImageFile,
  getWebpFilename,
  shouldReplace,
} from "./compression.mjs";
import {
  getUploadHookEnabled,
  getQuality,
  getOverridePercent,
} from "./settings.mjs";
import { CustomNotification } from "./notification.mjs";

const MODULE_ID = "lumenn-lightweight";
let uploadBypassDepth = 0;

export async function withUploadOptimizationBypassed(callback) {
  uploadBypassDepth++;
  try {
    return await callback();
  } finally {
    uploadBypassDepth--;
  }
}

export function registerUploadHook() {
  if (
    typeof libWrapper === "undefined" ||
    !game.modules?.get("lib-wrapper")?.active
  ) {
    console.warn(
      `${MODULE_ID}: libWrapper not found or active. Upload hook not registered.`,
    );
    if (game.user?.isGM) {
      ui.notifications?.warn(
        game.i18n?.localize(`${MODULE_ID}.notifications.noLibWrapper`) ||
          "libWrapper not active",
      );
    }
    return;
  }

  libWrapper.register(
    MODULE_ID,
    "FilePicker.upload",
    async function (wrapped, source, path, file, body, options) {
      if (uploadBypassDepth > 0) {
        return wrapped(source, path, file, body, options);
      }

      if (!game.user?.isGM) {
        return wrapped(source, path, file, body, options);
      }

      if (!getUploadHookEnabled()) {
        return wrapped(source, path, file, body, options);
      }

      if (!isImageFile(file.name)) {
        return wrapped(source, path, file, body, options);
      }

      if (file.type === "image/webp" || /\.webp$/i.test(file.name)) {
        return wrapped(source, path, file, body, options);
      }

      try {
        const quality = getQuality();
        const overridePercent = getOverridePercent();
        const compressed = await compressImage(file, quality);

        if (
          compressed.skipped ||
          !shouldReplace(
            compressed.originalSize,
            compressed.newSize,
            overridePercent,
          )
        ) {
          console.log(
            `${MODULE_ID}: ${file.name} - skipped or did not reduce size enough.`,
          );
          return wrapped(source, path, file, body, options);
        }

        const newName = getWebpFilename(file.name);
        const compressedFile = new File([compressed.blob], newName, {
          type: "image/webp",
        });

        const result = await wrapped(
          source,
          path,
          compressedFile,
          body,
          options,
        );

        CustomNotification.show({
          originalSize: compressed.originalSize,
          newSize: compressed.newSize,
          assetName: file.name,
        });

        return result;
      } catch (err) {
        console.warn(
          `${MODULE_ID}: Compression failed for ${file.name}, uploading original.`,
          err,
        );
        return wrapped(source, path, file, body, options);
      }
    },
    "WRAPPER",
  );
}
