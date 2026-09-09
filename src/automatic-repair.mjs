import { isWebpFile } from "./compression.mjs";
import {
  browseFoundryTree,
  getSiblingImagePaths,
  getStorageRoot,
  normalizeAssetStem,
} from "./file-recovery.mjs";
import { scanUnoptimizedAssets } from "./scanner.mjs";
import { updateAssetDocumentReference } from "./document-reference.mjs";

const MODULE_ID = "lumenn-lightweight";

function decodeRepeatedly(value) {
  let decoded = value;
  for (let index = 0; index < 3; index++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function normalizeFullPath(path) {
  return decodeRepeatedly(path.split(/[?#]/, 1)[0].replaceAll("\\", "/"))
    .normalize("NFKC")
    .toLocaleLowerCase();
}

export function findExistingWebpReference(files, requestedPath) {
  const webpFiles = [...new Set(files)].filter(isWebpFile);
  const siblingPath = getSiblingImagePaths(requestedPath).find(isWebpFile);
  const normalizedSibling = siblingPath ? normalizeFullPath(siblingPath) : null;
  const exactMatches = webpFiles.filter(
    (file) => normalizeFullPath(file) === normalizedSibling,
  );
  if (exactMatches.length === 1) return exactMatches[0];

  const requestedStem = normalizeAssetStem(requestedPath);
  const relocatedMatches = webpFiles.filter(
    (file) => normalizeAssetStem(file) === requestedStem,
  );
  return relocatedMatches.length === 1 ? relocatedMatches[0] : null;
}

export async function reconcileExistingWebpReferences(
  assets,
  { browseFn, updateDocumentFn },
) {
  const indexes = new Map();
  const failedRoots = new Set();
  const results = { repaired: 0, unchanged: 0, failed: [] };

  for (const asset of assets) {
    try {
      const root = getStorageRoot(asset.imgPath);
      if (!root) {
        results.unchanged++;
        continue;
      }
      if (!indexes.has(root)) {
        indexes.set(root, browseFoundryTree(root, browseFn));
      }
      let files;
      try {
        files = await indexes.get(root);
      } catch (error) {
        if (!failedRoots.has(root)) {
          failedRoots.add(root);
          console.error(
            `${MODULE_ID}: Não foi possível indexar ${root}`,
            error,
          );
          results.failed.push({ id: `root:${root}`, error: error.message });
        }
        continue;
      }
      const webpPath = findExistingWebpReference(files, asset.imgPath);
      if (!webpPath) {
        results.unchanged++;
        continue;
      }

      await updateDocumentFn(asset, webpPath);
      results.repaired++;
    } catch (error) {
      console.error(
        `${MODULE_ID}: Falha na reconciliação automática de ${asset.name}`,
        error,
      );
      results.failed.push({ id: asset.id, error: error.message });
    }
  }

  return results;
}

export async function reconcileWorldWebpReferences() {
  const collections = {
    actors: game.actors,
    items: game.items,
    scenes: game.scenes,
  };
  const assets = scanUnoptimizedAssets(collections);
  return reconcileExistingWebpReferences(assets, {
    browseFn: (...args) => FilePicker.browse(...args),
    updateDocumentFn: (asset, newPath) =>
      updateAssetDocumentReference(asset, newPath, collections),
  });
}

export async function runAutomaticReferenceRepair() {
  if (!game.user?.isGM) return null;
  const activeGm = game.users?.activeGM;
  if (activeGm && activeGm.id !== game.user.id) return null;

  const moduleVersion = game.modules.get(MODULE_ID)?.version ?? "unknown";
  if (
    game.settings.get(MODULE_ID, "lastReferenceRepairVersion") ===
    moduleVersion
  ) {
    return null;
  }

  const results = await reconcileWorldWebpReferences();

  if (results.failed.length === 0) {
    await game.settings.set(
      MODULE_ID,
      "lastReferenceRepairVersion",
      moduleVersion,
    );
  }
  if (results.repaired > 0) {
    ui.notifications.info(
      `${MODULE_ID}: ${results.repaired} referências atualizadas automaticamente para WebP.`,
    );
  }
  return results;
}
