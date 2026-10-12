const FIELD_BY_TYPE = {
  Actor: "img",
  "Actor Token": "prototypeToken.texture.src",
  "Scene Token": "texture.src",
  Item: "img",
  "Scene Background": "background.src",
  "Scene Foreground": "foreground",
};

// v14 Scene Levels own the image fields (Scene#background/#foreground are deprecated).
const LEVEL_FIELD_BY_TYPE = {
  "Scene Background": "background.src",
  "Scene Foreground": "foreground.src",
};

function getCollection(asset, collections) {
  if (asset.type.startsWith("Actor")) return collections.actors;
  if (asset.type === "Item") return collections.items;
  if (asset.type.startsWith("Scene")) return collections.scenes;
  return null;
}

export async function updateAssetDocumentReference(asset, newPath, collections) {
  const field = FIELD_BY_TYPE[asset.type];

  if (!field) throw new Error(`Tipo de asset não suportado: ${asset.type}`);

  if (asset.levelId) {
    const scene = collections.scenes?.get(asset.sceneId);
    const level = scene?.levels?.get(asset.levelId);
    if (!scene || !level) {
      throw new Error(`Level da Scene não encontrado: ${asset.levelId}`);
    }
    const levelField = LEVEL_FIELD_BY_TYPE[asset.type];
    await scene.updateEmbeddedDocuments("Level", [
      { _id: asset.levelId, [levelField]: newPath },
    ]);
    return { document: level, field: levelField, newPath };
  }

  if (asset.type === "Scene Token") {
    const scene = collections.scenes?.get(asset.sceneId);
    const token = scene?.tokens?.get(asset.id);
    if (!scene || !token) {
      throw new Error(`Documento Scene Token não encontrado: ${asset.id}`);
    }
    await scene.updateEmbeddedDocuments("Token", [
      { _id: asset.id, [field]: newPath },
    ]);
    return { document: token, field, newPath };
  }

  const document = getCollection(asset, collections)?.get(asset.id);
  if (!document) {
    throw new Error(`Documento ${asset.type} não encontrado: ${asset.id}`);
  }

  await document.update({ [field]: newPath });
  return { document, field, newPath };
}
