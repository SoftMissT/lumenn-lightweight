import {
  getFileExtension,
  isImageFile,
  isWebpFile,
} from "./compression.mjs";

export function identifyImageFormat(imgPath) {
  const extension = getFileExtension(imgPath);
  return ["png", "jpg", "jpeg", "webp"].includes(extension)
    ? extension.toUpperCase()
    : "UNKNOWN";
}

export function scanUnoptimizedAssets(collections, thresholdBytes = 102400) {
  const { actors = [], items = [], scenes = [] } = collections;
  const results = [];

  function evaluateAsset(id, type, name, imgPath, metadata = {}) {
    if (!imgPath || typeof imgPath !== "string") return;
    if (
      imgPath.startsWith("icons/svg/") ||
      imgPath.toLowerCase().split(/[?#]/, 1)[0].endsWith(".svg") ||
      !isImageFile(imgPath) ||
      isWebpFile(imgPath) ||
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
      format: identifyImageFormat(imgPath),
      currentSize: Number.MAX_SAFE_INTEGER,
      ...metadata,
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
    for (const token of doc.tokens ?? []) {
      evaluateAsset(
        token.id,
        "Scene Token",
        `${doc.name} / ${token.name}`,
        token.texture?.src,
        { sceneId: doc.id },
      );
    }
  }

  // Keep each document field as an independent target. Two documents can use
  // the same file while still requiring separate reference updates.
  return results;
}
