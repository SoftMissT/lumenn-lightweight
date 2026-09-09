import { compressImage, shouldReplace } from "./compression.mjs";
import { getQuality, getOverridePercent } from "./settings.mjs";

const MODULE_ID = "lumenn-lightweight";

export async function processBatch(selectedAssets, options = {}) {
  const {
    quality = getQuality(),
    overridePercent = getOverridePercent(),
    skipThresholdBytes = 102400,
    onProgress,
    updateDocumentFn,
    fetchImageFn,
    saveImageFn,
  } = options;

  const results = {
    processed: 0,
    skipped: 0,
    failed: [],
  };

  const total = selectedAssets.length;

  for (let i = 0; i < selectedAssets.length; i++) {
    const asset = selectedAssets[i];

    // micro-yield to avoid freezing UI
    await new Promise((r) => setTimeout(r, 0));

    try {
      const fileOrBlob = await fetchImageFn(asset.imgPath);

      const compressed = await compressImage(fileOrBlob, quality, {
        skipThresholdBytes,
      });

      if (
        compressed.skipped ||
        !shouldReplace(
          compressed.originalSize,
          compressed.newSize,
          overridePercent,
        )
      ) {
        results.skipped++;
      } else {
        const newImgPath = await saveImageFn(asset.imgPath, compressed.blob);
        await updateDocumentFn(asset, newImgPath);
        results.processed++;
      }
    } catch (err) {
      console.error(
        `${MODULE_ID}: Failed to process batch item ${asset.id}`,
        err,
      );
      results.failed.push({ id: asset.id, error: err.message });
    }

    if (onProgress) {
      onProgress({ done: i + 1, total, current: asset.name });
    }
  }

  return results;
}
