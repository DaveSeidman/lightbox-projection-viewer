import { useEffect, useState } from "react";
import * as THREE from "three";

export function useMediaTexture(source, type) {
  const [state, setState] = useState({ videoElement: null, mediaElement: null, mediaTexture: null });

  useEffect(() => {
    if (!source) {
      setState({ videoElement: null, mediaElement: null, mediaTexture: null });
      return undefined;
    }

    if (type?.startsWith("image/")) {
      let active = true;
      const image = new Image();
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      image.onload = () => {
        if (!active) return;
        texture.needsUpdate = true;
        setState({ videoElement: null, mediaElement: image, mediaTexture: texture });
      };
      image.crossOrigin = "anonymous";
      image.src = source;

      return () => {
        active = false;
        image.onload = null;
        texture.dispose();
      };
    }

    const video = document.createElement("video");
    video.src = source;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    video.load();
    setState({ videoElement: video, mediaElement: video, mediaTexture: texture });

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
    };
  }, [source, type]);

  return state;
}
