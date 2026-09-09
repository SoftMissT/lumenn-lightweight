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

export function getWildcardSearchPath(path) {
  if (typeof path !== "string") return null;
  const [pathname] = splitSuffix(path.replaceAll("\\", "/"));
  const cleanPath = pathname.replace(/^\/+/, "");
  const root = cleanPath.split("/", 1)[0];
  const filename = decodeRepeatedly(cleanPath.split("/").pop() ?? "");
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  if (!root || !stem || /[\\/]/.test(stem)) return null;
  return `${root}/**/${stem}.*`;
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
  const searches = new Map();

  async function searchFiles(path) {
    if (!browseFn) return [];
    const wildcardPath = getWildcardSearchPath(path);
    if (!wildcardPath) return [];
    const key = normalizeAssetStem(path);
    if (!searches.has(key)) {
      searches.set(
        key,
        Promise.resolve(
          browseFn("data", wildcardPath, { wildcard: true }),
        ).then(
          (result) => result?.files ?? [],
        ),
      );
    }
    return searches.get(key);
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
        return {
          blob: sibling.blob,
          sourcePath: sibling.sourcePath,
          repairRequired: true,
        };
      }
    }

    const files = await searchFiles(path);
    const relocatedPath = findUniqueAssetByStem(files, path);
    if (relocatedPath) {
      const relocated = await fetchCandidate(relocatedPath, fetchFn);
      if (relocated) {
        return {
          blob: relocated.blob,
          sourcePath: relocated.sourcePath,
          repairRequired: true,
        };
      }
    }

    throw new Error(
      `Arquivo não encontrado nem recuperado por extensão/nome: ${path}`,
    );
  };
}
