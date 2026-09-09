import {
  decodeFoundryFilename,
  getWebpFilename,
} from "./compression.mjs";
import { withUploadOptimizationBypassed } from "./upload-hook.mjs";

export async function uploadBatchImage(path, compressedBlob, uploadFn) {
  const pathParts = path.split("/");
  const encodedFilename = pathParts.pop();
  const filename = decodeFoundryFilename(encodedFilename);
  const webpName = getWebpFilename(filename);
  const targetPath = pathParts.join("/");
  const file = new File([compressedBlob], webpName, { type: "image/webp" });

  const uploadRes = await withUploadOptimizationBypassed(() =>
    uploadFn("data", targetPath, file, {}, { notify: false }),
  );
  const uploadedPath = uploadRes?.path ?? uploadRes;
  if (typeof uploadedPath !== "string" || !uploadedPath) {
    throw new Error("FilePicker.upload não retornou um caminho válido");
  }
  return uploadedPath;
}
