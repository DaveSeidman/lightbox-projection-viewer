import { useEffect, useState } from "react";
import * as THREE from "three";

export function useMediaTextures(files, onMediaMetadata) {
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    if (!files.length) {
      setMediaItems([]);
      return undefined;
    }

    let active = true;
    const cleanup = [];
    const items = files.map((file) => {
      if (file.type?.startsWith("image/")) {
        const image = new Image();
        const texture = configureTexture(new THREE.Texture(image));

        image.onload = () => {
          if (!active) return;
          texture.needsUpdate = true;
          onMediaMetadata?.(file.id, {
            naturalHeight: image.naturalHeight,
            naturalWidth: image.naturalWidth,
          });
        };
        image.crossOrigin = "anonymous";
        image.src = file.url;

        cleanup.push(() => {
          image.onload = null;
          texture.dispose();
        });

        return {
          ...file,
          videoElement: null,
          mediaElement: image,
          mediaTexture: texture,
        };
      }

      const video = document.createElement("video");
      video.src = file.url;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        if (!active) return;
        onMediaMetadata?.(file.id, {
          naturalHeight: video.videoHeight,
          naturalWidth: video.videoWidth,
        });
      };

      const texture = configureTexture(new THREE.VideoTexture(video));

      video.load();
      cleanup.push(() => {
        video.pause();
        video.onloadedmetadata = null;
        video.removeAttribute("src");
        video.load();
        texture.dispose();
      });

      return {
        ...file,
        videoElement: video,
        mediaElement: video,
        mediaTexture: texture,
      };
    });

    setMediaItems(items);

    return () => {
      active = false;
      cleanup.forEach((item) => item());
    };
  }, [files, onMediaMetadata]);

  return mediaItems;
}

function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
