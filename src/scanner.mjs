export function scanUnoptimizedAssets(collections, thresholdBytes = 102400) {
  const { actors = [], items = [], scenes = [] } = collections;
  const results = [];

  function evaluateAsset(id, type, name, imgPath) {
    if (!imgPath || typeof imgPath !== "string") return;
    if (
      imgPath.startsWith("icons/svg/") ||
      imgPath.endsWith(".svg") ||
      imgPath.startsWith("data:")
    )
      return;

    // Foundry files aren't physically scanned here for size,
    // so we just mark them as candidates. We'll pass a dummy size of Infinity
    // so the processor knows to check their real size before compressing.
    // The spec requires `currentSize`, but we can't synchronously get it.
    // If we assume the processor handles size threshold, we just return all candidates.
    // Actually, to fully match the spec `scanUnoptimizedAssets` should return items
    // where we don't know the size yet or assume it's large if it's not WebP.
    // If it is WebP, it might be small, but without fetching we don't know.
    results.push({
      id,
      type,
      name,
      imgPath,
      currentSize: Number.MAX_SAFE_INTEGER,
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

  // Remove duplicates based on imgPath
  const uniquePaths = new Set();
  return results.filter((asset) => {
    if (uniquePaths.has(asset.imgPath)) return false;
    uniquePaths.add(asset.imgPath);
    return true;
  });
}
