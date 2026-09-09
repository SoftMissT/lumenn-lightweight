export function resolveFoundryReference(absPath) {
  const dataPath = getFoundryDataPath();
  if (!absPath.startsWith(dataPath)) return null;

  const relative = absPath.slice(dataPath.length).replace(/^[/\\]/, "");
  return relative;
}

export function getFoundryDataPath() {
  return (
    game.data?.path ?? game.packs?.values()?.next()?.value?.metadata?.path ?? ""
  );
}

export async function updateReferences(oldPath, newPath) {
  const oldRef = resolveFoundryReference(oldPath);
  const newRef = resolveFoundryReference(newPath);
  if (!oldRef || !newRef) return;

  const collections = [...game.packs.values()];

  for (const pack of collections) {
    const documents = await pack.getDocuments();
    for (const doc of documents) {
      const changed = updateDocumentReferences(doc, oldRef, newRef);
      if (changed) {
        await doc.update({ img: doc.img });
      }
    }
  }
}

function updateDocumentReferences(doc, oldRef, newRef) {
  let changed = false;
  const fields = ["img", "prototypeToken.texture.src", "token.img"];

  for (const field of fields) {
    const value = getProperty(doc, field);
    if (typeof value === "string" && value.includes(oldRef)) {
      setProperty(doc, field, value.replace(oldRef, newRef));
      changed = true;
    }
  }

  return changed;
}

function getProperty(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function setProperty(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target && last) target[last] = value;
}
