const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

export function getFileExtension(filename) {
  if (typeof filename !== "string") return "";
  const cleanName = filename.split(/[?#]/, 1)[0];
  return cleanName.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageFile(filename) {
  return IMAGE_EXTENSIONS.includes(getFileExtension(filename));
}

export function isWebpFile(filename) {
  return getFileExtension(filename) === "webp";
}

export function decodeFoundryFilename(filename) {
  if (typeof filename !== "string") return "";
  const cleanName = filename.split(/[?#]/, 1)[0];

  try {
    return decodeURIComponent(cleanName).replace(/[\\/]/g, "_");
  } catch {
    return cleanName.replace(/[\\/]/g, "_");
  }
}

export function getWebpFilename(filename) {
  if (isWebpFile(filename)) return filename;
  const lastSlash = Math.max(
    filename.lastIndexOf("/"),
    filename.lastIndexOf("\\"),
  );
  const directory = lastSlash >= 0 ? filename.slice(0, lastSlash + 1) : "";
  const basename = filename.slice(lastSlash + 1);
  const cleanBasename = basename.split(/[?#]/, 1)[0];
  const dot = cleanBasename.lastIndexOf(".");
  const stem = dot > 0 ? cleanBasename.slice(0, dot) : cleanBasename;
  return `${directory}${stem}.webp`;
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
    fileOrBlob.type === "image/webp" || isWebpFile(fileOrBlob.name);
  // Existing WebPs are already in the target format and must never be
  // re-encoded. Recompression is lossy and creates duplicate uploads.
  if (isWebp) {
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
