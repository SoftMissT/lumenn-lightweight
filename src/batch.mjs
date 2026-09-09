import { compressImage, shouldReplace } from "./compression.mjs";
import { getQuality, getOverridePercent } from "./settings.mjs";

const MODULE_ID = "lumenn-lightweight";

export async function processBatch(selectedAssets, options = {}) {
  const {
    quality = getQuality(),
    overridePercent = getOverridePercent(),
    onProgress,
    updateDocumentFn,
    fetchImageFn,
    saveImageFn,
  } = options;

  const results = {
    processed: 0,
    repaired: 0,
    skipped: 0,
    failed: [],
  };

  const total = selectedAssets.length;

  for (let i = 0; i < selectedAssets.length; i++) {
    const asset = selectedAssets[i];

    // micro-yield to avoid freezing UI
    await new Promise((r) => setTimeout(r, 0));

    try {
      const fetched = await fetchImageFn(asset.imgPath);
      const fileOrBlob = fetched?.blob instanceof Blob ? fetched.blob : fetched;
      const repairRequired = fetched?.repairRequired === true;
      const sourcePath = fetched?.sourcePath ?? asset.imgPath;

      if (fetched?.existingOptimizedPath === true) {
        await updateDocumentFn(asset, sourcePath);
        results.processed++;
        results.repaired++;
        if (onProgress) {
          onProgress({ done: i + 1, total, current: asset.name });
        }
        continue;
      }

      const compressed = await compressImage(fileOrBlob, quality);

      if (repairRequired) {
        const repairedBlob = compressed.skipped ? fileOrBlob : compressed.blob;
        const newImgPath = await saveImageFn(sourcePath, repairedBlob);
        await updateDocumentFn(asset, newImgPath);
        results.processed++;
        results.repaired++;
      } else if (
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
