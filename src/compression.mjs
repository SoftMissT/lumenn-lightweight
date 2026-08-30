const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export function isImageFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export function getWebpFilename(filename) {
  const parts = filename.split('.');
  const ext = parts.pop()?.toLowerCase();
  if (ext === 'webp') return filename;
  return parts.join('.') + '.webp';
}

export async function compressImage(file, quality = 0.75) {
  if (!(file instanceof Blob) && !(file instanceof File)) {
    throw new TypeError('compressImage expects a Blob or File');
  }

  const bitmap = await createImageBitmap(file);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/webp', quality);
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: 'image/webp' });
}

export function shouldReplace(originalSize, newSize, overridePercent = 25) {
  if (originalSize <= 0) return false;
  const savedPercent = ((originalSize - newSize) / originalSize) * 100;
  return savedPercent >= overridePercent;
}
