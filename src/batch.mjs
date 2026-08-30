import { compressImage, isImageFile, getWebpFilename, shouldReplace } from './compression.mjs';
import { getQuality, getOverridePercent, getSkipExisting } from './settings.mjs';
import { resolveFoundryReference, updateReferences } from './paths.mjs';

const MODULE_ID = 'lumenn-lightweight';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

export async function optimizeDirectory(targetPath, options = {}) {
  const { recursive = false, onProgress } = options;
  const quality = getQuality();
  const overridePercent = getOverridePercent();
  const skipExisting = getSkipExisting();

  const results = {
    total: 0,
    optimized: 0,
    skipped: 0,
    failed: 0,
    bytesSaved: 0,
  };

  await _processDirectory(targetPath, {
    recursive,
    quality,
    overridePercent,
    skipExisting,
    onProgress,
    results,
  });

  return results;
}

async function _processDirectory(dirPath, opts) {
  const entries = await _readDir(dirPath);

  for (const entry of entries) {
    const fullPath = _joinPath(dirPath, entry.name);

    if (entry.isDirectory && opts.recursive) {
      await _processDirectory(fullPath, opts);
    } else if (entry.isFile) {
      await _processFile(fullPath, opts);
    }
  }
}

async function _processFile(filePath, opts) {
  const filename = _basename(filePath);
  const ext = filename.split('.').pop()?.toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) return;

  opts.results.total++;

  try {
    const fileData = await _readFile(filePath);
    const originalSize = fileData.byteLength;

    const webpName = getWebpFilename(filename);
    const webpPath = _joinPath(_dirname(filePath), webpName);

    if (opts.skipExisting && ext !== 'webp') {
      const exists = await _fileExists(webpPath);
      if (exists) {
        opts.results.skipped++;
        return;
      }
    }

    const blob = new Blob([fileData], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    const compressed = await compressImage(blob, opts.quality);

    if (!shouldReplace(originalSize, compressed.size, opts.overridePercent)) {
      opts.results.skipped++;
      return;
    }

    const compressedBuffer = await compressed.arrayBuffer();
    await _writeFile(webpPath, compressedBuffer);

    if (ext !== 'webp') {
      await _deleteFile(filePath);
      await updateReferences(filePath, webpPath);
    }

    opts.results.optimized++;
    opts.results.bytesSaved += originalSize - compressed.size;

    if (opts.onProgress) {
      opts.onProgress({
        file: filename,
        optimized: opts.results.optimized,
        total: opts.results.total,
      });
    }
  } catch (err) {
    console.error(`${MODULE_ID}: Failed to optimize ${filePath}`, err);
    opts.results.failed++;
  }
}

async function _readDir(path) {
  if (typeof readdir === 'function') {
    return await readdir(path, { withFileTypes: true });
  }
  if (typeof fs !== 'undefined' && fs.readdir) {
    return await fs.readdir(path, { withFileTypes: true });
  }
  throw new Error('No filesystem API available');
}

async function _readFile(path) {
  if (typeof readFile === 'function') {
    return await readFile(path);
  }
  if (typeof fs !== 'undefined' && fs.readFile) {
    return await fs.readFile(path);
  }
  throw new Error('No filesystem API available');
}

async function _writeFile(path, data) {
  if (typeof writeFile === 'function') {
    return await writeFile(path, data);
  }
  if (typeof fs !== 'undefined' && fs.writeFile) {
    return await fs.writeFile(path, data);
  }
  throw new Error('No filesystem API available');
}

async function _deleteFile(path) {
  if (typeof unlink === 'function') {
    return await unlink(path);
  }
  if (typeof fs !== 'undefined' && fs.unlink) {
    return await fs.unlink(path);
  }
}

async function _fileExists(path) {
  try {
    if (typeof access === 'function') {
      await access(path);
      return true;
    }
    if (typeof fs !== 'undefined' && fs.access) {
      await fs.access(path);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function _joinPath(...parts) {
  return parts.join('/').replace(/\/+/g, '/');
}

function _dirname(path) {
  return path.split('/').slice(0, -1).join('/') || '.';
}

function _basename(path) {
  return path.split('/').pop() || path;
}
