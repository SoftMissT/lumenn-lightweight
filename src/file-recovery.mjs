const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

function splitSuffix(path) {
  const hashIndex = path.indexOf("#");
  const queryIndex = path.indexOf("?");
  const suffixIndex = [hashIndex, queryIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? path.length;
  return [path.slice(0, suffixIndex), path.slice(suffixIndex)];
}

function decodeRepeatedly(value) {
  let decoded = value;
  for (let i = 0; i < 3; i++) {
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

export function getLiteralPercentPath(path) {
  if (typeof path !== "string" || !/%[0-9a-f]{2}/i.test(path)) return null;
  const [pathname, suffix] = splitSuffix(path);
  return `${pathname.replaceAll("%", "%25")}${suffix}`;
}

export function getSiblingImagePaths(path) {
  if (typeof path !== "string") return [];
  const [pathname, suffix] = splitSuffix(path);
  const dot = pathname.lastIndexOf(".");
  if (dot < pathname.lastIndexOf("/")) return [];
  const stem = pathname.slice(0, dot);
  const currentExtension = pathname.slice(dot + 1).toLowerCase();
  return IMAGE_EXTENSIONS.filter((extension) => extension !== currentExtension)
    .map((extension) => `${stem}.${extension}${suffix}`);
}

export function normalizeAssetStem(path) {
  if (typeof path !== "string") return "";
  const [pathname] = splitSuffix(path.replaceAll("\\", "/"));
  const filename = decodeRepeatedly(pathname.split("/").pop() ?? "");
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  return stem.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function findUniqueAssetByStem(files, requestedPath) {
  const requestedStem = normalizeAssetStem(requestedPath);
  const matches = [...new Set(files)].filter(
    (file) => normalizeAssetStem(file) === requestedStem,
  );
  return matches.length === 1 ? matches[0] : null;
}

function getStorageRoot(path) {
  if (typeof path !== "string") return null;
  const [pathname] = splitSuffix(path.replaceAll("\\", "/"));
  return pathname.replace(/^\/+/, "").split("/", 1)[0] || null;
}

export async function browseFoundryTree(
  root,
  browseFn,
  { maxDirectories = 5000 } = {},
) {
  const queue = [root];
  const visited = new Set();
  const files = [];

  while (queue.length > 0) {
    const directory = queue.shift();
    if (!directory || visited.has(directory)) continue;
    if (visited.size >= maxDirectories) {
      throw new Error(
        `Busca interrompida após ${maxDirectories} diretórios em ${root}`,
      );
    }

    visited.add(directory);
    let result;
    try {
      result = await browseFn("data", directory, {});
    } catch (error) {
      if (directory === root) throw error;
      console.warn(
        `lumenn-lightweight: Diretório ignorado durante busca: ${directory}`,
        error,
      );
      continue;
    }

    files.push(...(result?.files ?? []));
    for (const child of result?.dirs ?? []) {
      if (!visited.has(child)) queue.push(child);
    }

    if (visited.size % 25 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return files;
}

async function fetchCandidate(path, fetchFn) {
  const response = await fetchFn(path);
  if (response.ok) {
    return {
      blob: await response.blob(),
      sourcePath: path,
      literalPercent: false,
    };
  }

  const literalPath = getLiteralPercentPath(path);
  if (response.status === 404 && literalPath) {
    const literalResponse = await fetchFn(literalPath);
    if (literalResponse.ok) {
      return {
        blob: await literalResponse.blob(),
        sourcePath: path,
        literalPercent: true,
      };
    }
  }
  return null;
}

export function createFoundryImageFetcher({ fetchFn, browseFn }) {
  const storageIndexes = new Map();

  async function searchFiles(path) {
    if (!browseFn) return [];
    const root = getStorageRoot(path);
    if (!root) return [];
    if (!storageIndexes.has(root)) {
      storageIndexes.set(root, browseFoundryTree(root, browseFn));
    }
    return storageIndexes.get(root);
  }

  return async function fetchFoundryImage(path) {
    const direct = await fetchCandidate(path, fetchFn);
    if (direct) {
      return {
        blob: direct.blob,
        sourcePath: direct.sourcePath,
        repairRequired: direct.literalPercent,
      };
    }

    for (const siblingPath of getSiblingImagePaths(path)) {
      const sibling = await fetchCandidate(siblingPath, fetchFn);
      if (sibling) {
        const existingOptimizedPath =
          sibling.literalPercent === false &&
          /\.webp(?:[?#]|$)/i.test(sibling.sourcePath);
        return {
          blob: sibling.blob,
          sourcePath: sibling.sourcePath,
          repairRequired: true,
          existingOptimizedPath,
        };
      }
    }

    const files = await searchFiles(path);
    const relocatedPath = findUniqueAssetByStem(files, path);
    if (relocatedPath) {
      const relocated = await fetchCandidate(relocatedPath, fetchFn);
      if (relocated) {
        const existingOptimizedPath =
          relocated.literalPercent === false &&
          /\.webp(?:[?#]|$)/i.test(relocated.sourcePath);
        return {
          blob: relocated.blob,
          sourcePath: relocated.sourcePath,
          repairRequired: true,
          existingOptimizedPath,
        };
      }
    }

    throw new Error(
      `Arquivo não encontrado nem recuperado por extensão/nome: ${path}`,
    );
  };
}
