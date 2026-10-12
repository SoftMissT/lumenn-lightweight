// Foundry v13 namespaced FilePicker; the global is deprecated (removed in v15).
export const FILE_PICKER_UPLOAD_TARGET =
  "foundry.applications.apps.FilePicker.implementation.upload";

export function getFilePicker() {
  return (
    foundry.applications?.apps?.FilePicker?.implementation ??
    globalThis.FilePicker
  );
}
