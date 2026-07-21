import { useCallback, useState } from "react";
import { ControlPanel } from "./components/ControlPanel.jsx";
import { DEFAULT_OUTLINE_URL, LayoutCanvas } from "./components/LayoutCanvas.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { DEFAULT_UV } from "./data/projection.js";
import { LAYOUT_HEIGHT, LAYOUT_WIDTH, useLayoutTexture } from "./hooks/useLayoutTexture.js";
import { MAX_MEDIA_FILES, useObjectUrls } from "./hooks/useObjectUrl.js";
import { useMediaTextures } from "./hooks/useVideoTexture.js";
import { ProjectionCanvas } from "./scene/ProjectionCanvas.jsx";

const DEFAULT_MODEL_URL = `${import.meta.env.BASE_URL}240_west_37th_projection.glb`;
const DEFAULT_AO = {
  opacity: 0.09,
  blur: 0.11,
  distance: 0.39,
  area: 14.4,
};
const DEFAULT_REFLECTION = {
  blur: 1,
  strength: 1,
};
const DEFAULT_MODEL_LIGHT_INTENSITY = 1;
const DEFAULT_LAYOUT_PLACEMENT = {
  x: 0,
  y: 0,
  width: LAYOUT_WIDTH,
  height: LAYOUT_HEIGHT,
};

function App() {
  const [mode, setMode] = useState("light");
  const [uv, setUv] = useState(DEFAULT_UV);
  const [ao, setAo] = useState(DEFAULT_AO);
  const [reflection, setReflection] = useState(DEFAULT_REFLECTION);
  const [modelLightIntensity, setModelLightIntensity] = useState(DEFAULT_MODEL_LIGHT_INTENSITY);
  const [playback, setPlayback] = useState("idle");
  const [showFurniture, setShowFurniture] = useState(true);
  const [showPlants, setShowPlants] = useState(true);
  const [preset, setPreset] = useState("lounge");
  const [panelOpen, setPanelOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [layoutPlacements, setLayoutPlacements] = useState({});
  const [activeMediaId, setActiveMediaId] = useState("");
  const [cameraPath, setCameraPath] = useState(null);
  const [cameraClips, setCameraClips] = useState([]);

  const mediaFiles = useObjectUrls();
  const mediaItems = useMediaTextures(mediaFiles.files);
  const videoElements = mediaItems.map((item) => item.videoElement).filter(Boolean);
  const { layoutCanvas, layoutTexture } = useLayoutTexture({
    mediaItems,
    placements: layoutPlacements,
  });

  const handleMediaFile = (event) => {
    const files = [...(event.target.files || [])].slice(0, MAX_MEDIA_FILES);
    if (!files.length) return;
    const records = mediaFiles.setFiles(files);
    const nextPlacements = {};
    records.forEach((file, index) => {
      nextPlacements[file.id] = defaultPlacementForIndex(index, records.length);
    });
    setLayoutPlacements(nextPlacements);
    setActiveMediaId(Object.keys(nextPlacements)[0] || "");
    setPlayback(files.some((file) => file.type.startsWith("video/")) ? "ready" : "static");
    event.target.value = "";
  };

  const handleClearMedia = () => {
    mediaFiles.clearFiles();
    setLayoutPlacements({});
    setActiveMediaId("");
    setPlayback("idle");
  };

  const handlePlaybackToggle = async () => {
    if (!videoElements.length) return;
    if (videoElements.some((video) => video.paused)) {
      try {
        videoElements.forEach((video) => {
          video.currentTime = 0;
        });
        await Promise.all(videoElements.map((video) => video.play()));
        setPlayback("playing");
      } catch {
        setPlayback("blocked");
      }
    } else {
      videoElements.forEach((video) => video.pause());
      setPlayback("paused");
    }
  };

  const handleUvChange = (key, value) => {
    setUv((current) => ({ ...current, [key]: Number(value) }));
  };

  const handleAoChange = (key, value) => {
    setAo((current) => ({ ...current, [key]: Number(value) }));
  };

  const handleReflectionChange = (key, value) => {
    setReflection((current) => ({ ...current, [key]: Number(value) }));
  };

  const handleLayoutPlacementChange = (id, key, value) => {
    setLayoutPlacements((current) => ({
      ...current,
      [id]: normalizeLayoutPlacement({
        ...(current[id] || DEFAULT_LAYOUT_PLACEMENT),
        [key]: Number(value),
      }),
    }));
  };

  const handleCameraPath = (id) => {
    setCameraPath(id ? { id, run: Date.now() } : null);
  };

  const handleCameraCycle = () => {
    if (!cameraClips.length) return;

    const currentIndex = cameraClips.findIndex((clip) => clip.id === cameraPath?.id);
    const nextClip = cameraClips[(currentIndex + 1) % cameraClips.length];
    setCameraPath({ id: nextClip.id, run: Date.now() });
  };

  const handleAnimationClips = useCallback((clips) => {
    setCameraClips(clips);
    setCameraPath((current) => {
      if (!current) return current;
      return clips.some((clip) => clip.id === current.id) ? current : null;
    });
  }, []);

  return (
    <main
      className={`projection-app projection-app--${mode}`}
      data-testid="projection-app"
    >
      <div className="projection-app__scene" data-testid="canvas-host">
        <ProjectionCanvas
          mode={mode}
          uv={uv}
          ao={ao}
          reflection={reflection}
          modelLightIntensity={modelLightIntensity}
          mediaTexture={mediaItems.length ? layoutTexture : null}
          modelUrl={DEFAULT_MODEL_URL}
          showDemoRoom={false}
          showFurniture={showFurniture}
          showPlants={showPlants}
          preset={preset}
          cameraPath={cameraPath}
          onAnimationClips={handleAnimationClips}
          onCameraPathEnd={() => setCameraPath(null)}
        />
      </div>

      <TopBar mode={mode} onModeChange={setMode} />

      <LayoutCanvas
        layoutCanvas={layoutCanvas}
        outlineUrl={DEFAULT_OUTLINE_URL}
        mediaItems={mediaItems}
        placements={layoutPlacements}
        activeMediaId={activeMediaId}
        panelOpen={layoutOpen}
        hasMedia={Boolean(mediaItems.length)}
        onActiveMediaChange={setActiveMediaId}
        onPanelToggle={() => setLayoutOpen((value) => !value)}
        onPlacementChange={handleLayoutPlacementChange}
        onPlacementReset={() => {
          if (!activeMediaId) return;
          setLayoutPlacements((current) => ({ ...current, [activeMediaId]: DEFAULT_LAYOUT_PLACEMENT }));
        }}
      />

      <ControlPanel
        uv={uv}
        ao={ao}
        reflection={reflection}
        modelLightIntensity={modelLightIntensity}
        mode={mode}
        mediaName={mediaFiles.files.length ? `${mediaFiles.files.length} media file${mediaFiles.files.length === 1 ? "" : "s"}` : "Fallback"}
        playback={playback}
        hasMedia={Boolean(mediaFiles.files.length)}
        canPlay={Boolean(videoElements.length)}
        panelOpen={panelOpen}
        showFurniture={showFurniture}
        showPlants={showPlants}
        preset={preset}
        activeCameraPath={cameraPath?.id || ""}
        cameraClips={cameraClips}
        onMediaFile={handleMediaFile}
        onClearMedia={handleClearMedia}
        onPanelToggle={() => setPanelOpen((value) => !value)}
        onPlaybackToggle={handlePlaybackToggle}
        onUvChange={handleUvChange}
        onUvReset={() => setUv(DEFAULT_UV)}
        onAoChange={handleAoChange}
        onAoReset={() => setAo(DEFAULT_AO)}
        onReflectionChange={handleReflectionChange}
        onReflectionReset={() => setReflection(DEFAULT_REFLECTION)}
        onModelLightIntensityChange={(value) => setModelLightIntensity(Number(value))}
        onModelLightIntensityReset={() => setModelLightIntensity(DEFAULT_MODEL_LIGHT_INTENSITY)}
        onShowFurnitureChange={setShowFurniture}
        onShowPlantsChange={setShowPlants}
        onPresetChange={setPreset}
        onCameraPath={handleCameraPath}
        onCameraCycle={handleCameraCycle}
        onCameraStop={() => setCameraPath(null)}
      />
    </main>
  );
}

export default App;

function normalizeLayoutPlacement(placement) {
  const width = clamp(placement.width, 20, LAYOUT_WIDTH);
  const height = clamp(placement.height, 20, LAYOUT_HEIGHT);

  return {
    width,
    height,
    x: clamp(placement.x, 0, LAYOUT_WIDTH - width),
    y: clamp(placement.y, 0, LAYOUT_HEIGHT - height),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function defaultPlacementForIndex(index, total) {
  const width = LAYOUT_WIDTH / total;
  return normalizeLayoutPlacement({
    x: width * index,
    y: 0,
    width,
    height: LAYOUT_HEIGHT,
  });
}
