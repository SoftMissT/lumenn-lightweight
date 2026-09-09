const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

export function isImageFile(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export function getWebpFilename(filename) {
  const parts = filename.split(".");
  const ext = parts.pop()?.toLowerCase();
  if (ext === "webp") return filename;
  return parts.join(".") + ".webp";
}

export function shouldReplace(originalSize, newSize, overridePercent = 25) {
  if (originalSize <= 0) return false;
  const savedPercent = ((originalSize - newSize) / originalSize) * 100;
  return savedPercent >= overridePercent;
}

export async function compressImage(
  fileOrBlob,
  quality = 0.85,
  options = { skipThresholdBytes: 102400 },
) {
  if (!(fileOrBlob instanceof Blob) && !(fileOrBlob instanceof File)) {
    throw new TypeError("compressImage expects a Blob or File");
  }

  const originalSize = fileOrBlob.size;

  const isWebp =
    fileOrBlob.type === "image/webp" ||
    (fileOrBlob.name && fileOrBlob.name.toLowerCase().endsWith(".webp"));
  if (isWebp && originalSize <= options.skipThresholdBytes) {
    return {
      blob: fileOrBlob,
      originalSize,
      newSize: originalSize,
      skipped: true,
    };
  }

  const bitmap = await createImageBitmap(fileOrBlob);
  let compressedBlob;

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    compressedBlob = await canvas.convertToBlob({
      type: "image/webp",
      quality,
    });
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    compressedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/webp",
        quality,
      );
    });
  }

  return {
    blob: compressedBlob,
    originalSize,
    newSize: compressedBlob.size,
    skipped: false,
  };
}
