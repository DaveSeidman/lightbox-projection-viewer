import { useEffect, useMemo } from "react";
import * as THREE from "three";

export function useProjectedTexture(sourceTexture, uv, segment) {
  const texture = useMemo(() => {
    if (!sourceTexture) return null;
    const cloned = sourceTexture.clone();
    cloned.needsUpdate = true;
    return cloned;
  }, [sourceTexture]);

  useEffect(() => {
    if (!texture) return;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.center.set(0.5, 0.5);
    texture.repeat.set((segment?.width ?? 1) * uv.repeatX, uv.repeatY);
    texture.offset.set((segment?.start ?? 0) + uv.offsetX, uv.offsetY);
    texture.rotation = THREE.MathUtils.degToRad(uv.rotation);
    texture.needsUpdate = true;
  }, [texture, uv, segment]);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  return texture;
}
