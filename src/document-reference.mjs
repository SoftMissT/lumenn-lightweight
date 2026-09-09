const FIELD_BY_TYPE = {
  Actor: "img",
  "Actor Token": "prototypeToken.texture.src",
  Item: "img",
  "Scene Background": "background.src",
  "Scene Foreground": "foreground",
};

function getCollection(asset, collections) {
  if (asset.type.startsWith("Actor")) return collections.actors;
  if (asset.type === "Item") return collections.items;
  if (asset.type.startsWith("Scene")) return collections.scenes;
  return null;
}

export async function updateAssetDocumentReference(asset, newPath, collections) {
  const field = FIELD_BY_TYPE[asset.type];
  const collection = getCollection(asset, collections);
  const document = collection?.get(asset.id);

  if (!field) throw new Error(`Tipo de asset não suportado: ${asset.type}`);
  if (!document) {
    throw new Error(`Documento ${asset.type} não encontrado: ${asset.id}`);
  }

  await document.update({ [field]: newPath });
  return { document, field, newPath };
}
