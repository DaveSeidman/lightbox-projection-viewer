import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLoader } from "@react-three/fiber";
import {
  animationClipId,
  animationClipLabel,
  FURNITURE_NAME_PATTERN,
  PLANT_NAME_PATTERN,
  PROJECTION_NAME_PATTERN,
} from "../data/projection.js";
import { LAYOUT_HEIGHT, LAYOUT_WIDTH } from "../hooks/useLayoutTexture.js";

const SHEETROCK_UV_REPEATS_PER_UNIT = 18;
const FLOOR_NAME_PATTERN = /^floor$/i;
const PROJECTION_UV_ASPECT = LAYOUT_WIDTH / LAYOUT_HEIGHT;

export function UploadedModel({
  url,
  mode,
  uv,
  ao,
  modelLightIntensity,
  texture,
  showFurniture,
  showPlants,
  onStats,
  onReady,
  onAnimationClips,
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => normalizeScene(gltf.scene.clone(true)), [gltf.scene]);
  const sheetrockNormalMap = useMemo(createSheetrockNormalMap, []);
  const animations = gltf.animations;

  useEffect(() => {
    const clips = animations.map((clip, index) => ({
      id: animationClipId(clip, index),
      label: animationClipLabel(clip, index),
      duration: clip.duration,
    }));

    onReady?.({ scene, animations });
    onAnimationClips?.(clips);

    return () => {
      onReady?.(null);
      onAnimationClips?.([]);
    };
  }, [animations, onAnimationClips, onReady, scene]);

  useEffect(() => {
    return () => {
      sheetrockNormalMap.dispose();
    };
  }, [sheetrockNormalMap]);

  useEffect(() => {
    const intensity = THREE.MathUtils.clamp(modelLightIntensity ?? 1, 0, 6);

    scene.traverse((object) => {
      if (!object.isLight) return;

      if (!Number.isFinite(object.userData.originalIntensity)) {
        object.userData.originalIntensity = object.intensity;
      }

      object.intensity = object.userData.originalIntensity * intensity;
      object.visible = intensity > 0.001;
    });
  }, [modelLightIntensity, scene]);

  useEffect(() => {
    let meshCount = 0;
    let projectionSurfaces = 0;
    let furnitureLike = 0;
    let plantLike = 0;
    const generatedMaterials = [];

    scene.updateMatrixWorld(true);

    scene.traverse((object) => {
      if (!object.isMesh) return;
      meshCount += 1;

      const name = object.name || "";
      const isProjection =
        PROJECTION_NAME_PATTERN.test(name) || (scene.children.length <= 4 && meshCount <= 4);
      const isFloor = FLOOR_NAME_PATTERN.test(name);
      const isFurniture = FURNITURE_NAME_PATTERN.test(name);
      const isPlant = PLANT_NAME_PATTERN.test(name);

      if (isFurniture) furnitureLike += 1;
      if (isPlant) plantLike += 1;

      object.visible = !isFloor && (!isFurniture || showFurniture) && (!isPlant || showPlants);

      if (!object.userData.originalMaterial) {
        object.userData.originalMaterial = object.material;
      }

      if (isProjection && texture) {
        projectionSurfaces += 1;
        object.userData.excludeFromScreenSpaceAo = true;
        object.castShadow = false;
        object.receiveShadow = false;
        object.renderOrder = 2;
        const material = createProjectionMaterial({ texture, uv, mode });
        object.material = material;
        generatedMaterials.push(material);
      } else {
        object.userData.excludeFromScreenSpaceAo = false;
        object.castShadow = mode === "dark";
        object.receiveShadow = mode === "dark";
        object.renderOrder = 0;

        if (!isFurniture && !isPlant) {
          applyBoxUvMapping(object);
        }

        const material = createModelSurfaceMaterial({
          mode,
          originalMaterial: object.userData.originalMaterial,
          normalMap: sheetrockNormalMap,
        });
        object.material = material;
        generatedMaterials.push(material);
      }
    });

    onStats?.({ meshCount, projectionSurfaces, furnitureLike, plantLike });

    return () => {
      generatedMaterials.forEach((material) => {
        material.dispose();
      });
    };
  }, [scene, texture, uv, mode, ao, showFurniture, showPlants, onStats, sheetrockNormalMap]);

  return <primitive object={scene} />;
}

function normalizeScene(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) return scene;

  const scale = 10 / maxDimension;
  scene.scale.setScalar(scale);
  scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

  return scene;
}

function createModelSurfaceMaterial({ mode, originalMaterial, normalMap }) {
  return new THREE.MeshStandardMaterial({
    color: mode === "light" ? "#aaa79d" : "#d8d8d2",
    roughness: mode === "light"
      ? 0.48
      : getOriginalMaterialNumber(originalMaterial, "roughness", 0.74),
    metalness: getOriginalMaterialNumber(originalMaterial, "metalness", 0),
    envMapIntensity: mode === "light" ? 0.36 : 0.035,
    normalMap,
    normalScale: mode === "light"
      ? new THREE.Vector2(0.07, 0.07)
      : new THREE.Vector2(0.035, 0.035),
    side: THREE.DoubleSide,
  });
}

function createSheetrockNormalMap() {
  const size = 128;
  const height = new Float32Array(size * size);
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fine = valueNoise(x * 0.52, y * 0.52);
      const mid = valueNoise(x * 0.18 + 23.7, y * 0.18 + 41.3);
      const grain = hash2d(x, y);
      height[y * size + x] = fine * 0.45 + mid * 0.38 + grain * 0.17;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const normal = new THREE.Vector3((left - right) * 1.8, (up - down) * 1.8, 1).normalize();
      const offset = (y * size + x) * 4;

      data[offset] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hash2d(x0, y0);
  const b = hash2d(x0 + 1, y0);
  const c = hash2d(x0, y0 + 1);
  const d = hash2d(x0 + 1, y0 + 1);

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, tx),
    THREE.MathUtils.lerp(c, d, tx),
    ty,
  );
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function hash2d(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function getOriginalMaterialColor(originalMaterial) {
  const material = Array.isArray(originalMaterial) ? originalMaterial[0] : originalMaterial;
  if (material?.color?.isColor) {
    const color = material.color.clone();
    return color.getHSL({}).l < 0.18 ? new THREE.Color("#484d52") : color;
  }

  return new THREE.Color("#484d52");
}

function getOriginalMaterialNumber(originalMaterial, key, fallback) {
  const material = Array.isArray(originalMaterial) ? originalMaterial[0] : originalMaterial;
  return Number.isFinite(material?.[key]) ? material[key] : fallback;
}

function applyBoxUvMapping(object) {
  if (object.userData.boxUvMappingApplied || !object.geometry?.attributes?.position) return;

  object.updateWorldMatrix(true, false);
  const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 3) {
    a.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
    b.fromBufferAttribute(position, index + 1).applyMatrix4(object.matrixWorld);
    c.fromBufferAttribute(position, index + 2).applyMatrix4(object.matrixWorld);

    normal
      .crossVectors(edgeA.subVectors(b, a), edgeB.subVectors(c, a))
      .normalize();

    writeBoxUvForVertex(uv, index, a, normal);
    writeBoxUvForVertex(uv, index + 1, b, normal);
    writeBoxUvForVertex(uv, index + 2, c, normal);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.attributes.uv.needsUpdate = true;
  object.geometry = geometry;
  object.userData.boxUvMappingApplied = true;
}

function writeBoxUvForVertex(uv, index, position, normal) {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  let u;
  let v;

  if (absY >= absX && absY >= absZ) {
    u = position.x;
    v = position.z;
  } else if (absX >= absZ) {
    u = position.z;
    v = position.y;
  } else {
    u = position.x;
    v = position.y;
  }

  uv[index * 2] = u * SHEETROCK_UV_REPEATS_PER_UNIT;
  uv[index * 2 + 1] = v * SHEETROCK_UV_REPEATS_PER_UNIT;
}

function createProjectionMaterial({ texture, uv, mode }) {
  const projectedTexture = texture;
  projectedTexture.flipY = false;
  projectedTexture.wrapS = THREE.ClampToEdgeWrapping;
  projectedTexture.wrapT = THREE.ClampToEdgeWrapping;
  projectedTexture.colorSpace = THREE.SRGBColorSpace;
  projectedTexture.center.set(0, 0.5);
  projectedTexture.repeat.set(uv.repeatX / PROJECTION_UV_ASPECT, uv.repeatY);
  projectedTexture.offset.set(uv.offsetX / PROJECTION_UV_ASPECT, uv.offsetY);
  projectedTexture.rotation = THREE.MathUtils.degToRad(uv.rotation);
  projectedTexture.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    map: projectedTexture,
    emissiveMap: projectedTexture,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: mode === "dark" ? 4 * uv.brightness : 0.12 * uv.brightness,
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: mode === "dark" ? 0.02 : 0.06,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}
