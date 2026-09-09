import { isImageFile, isWebpFile } from "./compression.mjs";

export function scanUnoptimizedAssets(collections, thresholdBytes = 102400) {
  const { actors = [], items = [], scenes = [] } = collections;
  const results = [];

  function evaluateAsset(id, type, name, imgPath) {
    if (!imgPath || typeof imgPath !== "string") return;
    if (
      imgPath.startsWith("icons/svg/") ||
      imgPath.toLowerCase().split(/[?#]/, 1)[0].endsWith(".svg") ||
      !isImageFile(imgPath) ||
      imgPath.startsWith("data:")
    )
      return;

    // Foundry files aren't physically scanned here for size, so non-WebP
    // image assets are returned as candidates for the asynchronous processor.
    results.push({
      id,
      type,
      name,
      imgPath,
      currentSize: Number.MAX_SAFE_INTEGER,
      requiresSizeCheck: isWebpFile(imgPath),
    });
  }

  for (const doc of actors) {
    if (doc.img) evaluateAsset(doc.id, "Actor", doc.name, doc.img);
    if (doc.prototypeToken?.texture?.src) {
      evaluateAsset(
        doc.id,
        "Actor Token",
        doc.name,
        doc.prototypeToken.texture.src,
      );
    }
  }

  for (const doc of items) {
    if (doc.img) evaluateAsset(doc.id, "Item", doc.name, doc.img);
  }

  for (const doc of scenes) {
    if (doc.background?.src)
      evaluateAsset(doc.id, "Scene Background", doc.name, doc.background.src);
    if (doc.foreground)
      evaluateAsset(doc.id, "Scene Foreground", doc.name, doc.foreground);
  }

  // Keep each document field as an independent target. Two documents can use
  // the same file while still requiring separate reference updates.
  return results;
}
