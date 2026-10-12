import { compressImage, shouldReplace } from "./compression.mjs";
import { getQuality, getOverridePercent } from "./settings.mjs";

const MODULE_ID = "lumenn-lightweight";
const YIELD_AFTER_MS = 16;

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

  // The same file is often referenced by many documents (tokens repeated across
  // scenes). Fetch/compress/upload it once; later documents reuse the outcome.
  const outcomes = new Map();

  const total = selectedAssets.length;
  let lastYield = performance.now();

  for (let i = 0; i < selectedAssets.length; i++) {
    const asset = selectedAssets[i];

    // Give the UI a turn only after a frame of work; a timer per item costs
    // the browser's minimum timeout (~4 ms) even when the item was instant.
    if (performance.now() - lastYield >= YIELD_AFTER_MS) {
      await new Promise((r) => setTimeout(r, 0));
      lastYield = performance.now();
    }

    // `stage` tells the error log where an item broke: fetch, compress, upload or update.
    let stage = "fetch";
    try {
      const known = outcomes.get(asset.imgPath);
      if (known?.kind === "failed") {
        stage = known.stage;
        throw known.error;
      }
      if (known?.kind === "skipped") {
        results.skipped++;
      } else if (known?.kind === "updated") {
        stage = "update";
        await updateDocumentFn(asset, known.path);
        results.processed++;
        if (known.repaired) results.repaired++;
      } else {
        const fetched = await fetchImageFn(asset.imgPath);
        const fileOrBlob = fetched?.blob instanceof Blob ? fetched.blob : fetched;
        const repairRequired = fetched?.repairRequired === true;
        const sourcePath = fetched?.sourcePath ?? asset.imgPath;

        if (fetched?.existingOptimizedPath === true) {
          stage = "update";
          await updateDocumentFn(asset, sourcePath);
          results.processed++;
          results.repaired++;
          outcomes.set(asset.imgPath, { kind: "updated", path: sourcePath, repaired: true });
        } else {
          stage = "compress";
          const compressed = await compressImage(fileOrBlob, quality);

          if (repairRequired) {
            const repairedBlob = compressed.skipped ? fileOrBlob : compressed.blob;
            stage = "upload";
            const newImgPath = await saveImageFn(sourcePath, repairedBlob);
            stage = "update";
            await updateDocumentFn(asset, newImgPath);
            results.processed++;
            results.repaired++;
            outcomes.set(asset.imgPath, { kind: "updated", path: newImgPath, repaired: true });
          } else if (
            compressed.skipped ||
            !shouldReplace(
              compressed.originalSize,
              compressed.newSize,
              overridePercent,
            )
          ) {
            results.skipped++;
            outcomes.set(asset.imgPath, { kind: "skipped" });
          } else {
            stage = "upload";
            const newImgPath = await saveImageFn(asset.imgPath, compressed.blob);
            stage = "update";
            await updateDocumentFn(asset, newImgPath);
            results.processed++;
            outcomes.set(asset.imgPath, { kind: "updated", path: newImgPath });
          }
        }
      }
    } catch (err) {
      // Only file-level stages are shared across documents; an `update` failure
      // belongs to this one document and must not poison its siblings.
      if (stage !== "update" && !outcomes.has(asset.imgPath)) {
        outcomes.set(asset.imgPath, { kind: "failed", stage, error: err });
      }
      console.error(
        `${MODULE_ID}: Failed to process batch item ${asset.id}`,
        err,
      );
      results.failed.push({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        path: asset.imgPath,
        stage,
        error: err?.message ?? String(err),
      });
    }

    if (onProgress) {
      onProgress({ done: i + 1, total, current: asset.name });
    }
  }

  return results;
}
