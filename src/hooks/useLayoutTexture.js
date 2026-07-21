import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const LAYOUT_WIDTH = 10300;
export const LAYOUT_HEIGHT = 1080;

export function useLayoutTexture({ mediaItems, placements }) {
  const canvas = useMemo(() => {
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = LAYOUT_WIDTH;
    nextCanvas.height = LAYOUT_HEIGHT;
    return nextCanvas;
  }, []);

  const texture = useMemo(() => {
    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.wrapS = THREE.ClampToEdgeWrapping;
    nextTexture.wrapT = THREE.ClampToEdgeWrapping;
    return nextTexture;
  }, [canvas]);

  useEffect(() => {
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let active = true;
    let frameId = 0;
    const draw = () => {
      if (!active) return;

      context.clearRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT);
      context.fillStyle = "#050608";
      context.fillRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT);

      mediaItems.forEach((item) => {
        const placement = placements[item.id];
        if (!placement || !canDrawMedia(item.mediaElement, item.type)) return;

        context.drawImage(
          item.mediaElement,
          placement.x,
          placement.y,
          placement.width,
          placement.height,
        );
      });

      texture.needsUpdate = true;
      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [canvas, mediaItems, placements, texture]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return { layoutCanvas: canvas, layoutTexture: texture };
}

function canDrawMedia(mediaElement, mediaType) {
  if (!mediaElement) return false;
  if (mediaType?.startsWith("image/")) return mediaElement.complete && mediaElement.naturalWidth > 0;
  return mediaElement.readyState >= 2 && mediaElement.videoWidth > 0;
}
