import * as THREE from "three";

const runtimeOwnedMaterialKey = "freestyleOwnedMaterialClone";
const runtimePreparedMaterialKey = "freestyleMaterialPrepared";

function isRenderableMesh(object: THREE.Object3D): object is THREE.Mesh | THREE.SkinnedMesh {
  return object instanceof THREE.Mesh;
}

function markOwnedMaterialClone(material: THREE.Material) {
  material.userData = {
    ...material.userData,
    [runtimeOwnedMaterialKey]: true,
  };
  return material;
}

export function ensureRuntimeOwnedMaterials(object: THREE.Mesh | THREE.SkinnedMesh) {
  if (object.userData[runtimePreparedMaterialKey]) {
    return;
  }

  object.material = Array.isArray(object.material)
    ? object.material.map((material) => (material ? markOwnedMaterialClone(material.clone()) : material))
    : object.material
      ? markOwnedMaterialClone(object.material.clone())
      : object.material;

  object.userData[runtimePreparedMaterialKey] = true;
}

export function disposeRuntimeOwnedMaterials(root: THREE.Object3D) {
  const disposedMaterials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (!isRenderableMesh(object)) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material || disposedMaterials.has(material) || !material.userData?.[runtimeOwnedMaterialKey]) {
        return;
      }
      disposedMaterials.add(material);
      delete material.userData[runtimeOwnedMaterialKey];
      material.dispose();
    });

    delete object.userData[runtimePreparedMaterialKey];
  });
}
