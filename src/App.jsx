import { useCallback, useState } from "react";
import { ControlPanel } from "./components/ControlPanel.jsx";
import { DEFAULT_OUTLINE_URL, LayoutCanvas } from "./components/LayoutCanvas.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { DEFAULT_UV } from "./data/projection.js";
import { LAYOUT_HEIGHT, LAYOUT_WIDTH, useLayoutTexture } from "./hooks/useLayoutTexture.js";
import { useObjectUrl } from "./hooks/useObjectUrl.js";
import { useMediaTexture } from "./hooks/useVideoTexture.js";
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
  const [playback, setPlayback] = useState("idle");
  const [showFurniture, setShowFurniture] = useState(true);
  const [showPlants, setShowPlants] = useState(true);
  const [preset, setPreset] = useState("lounge");
  const [panelOpen, setPanelOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [layoutPlacement, setLayoutPlacement] = useState(DEFAULT_LAYOUT_PLACEMENT);
  const [cameraPath, setCameraPath] = useState(null);
  const [cameraClips, setCameraClips] = useState([]);

  const mediaFile = useObjectUrl();
  const { videoElement, mediaElement } = useMediaTexture(mediaFile.url, mediaFile.type);
  const { layoutCanvas, layoutTexture } = useLayoutTexture({
    mediaElement,
    mediaType: mediaFile.type,
    placement: layoutPlacement,
  });

  const handleMediaFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    mediaFile.setFile(file);
    setPlayback(file.type.startsWith("image/") ? "static" : "ready");
    event.target.value = "";
  };

  const handleClearMedia = () => {
    mediaFile.clearFile();
    setPlayback("idle");
  };

  const handlePlaybackToggle = async () => {
    if (!videoElement) return;
    if (videoElement.paused) {
      try {
        await videoElement.play();
        setPlayback("playing");
      } catch {
        setPlayback("blocked");
      }
    } else {
      videoElement.pause();
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

  const handleLayoutPlacementChange = (key, value) => {
    setLayoutPlacement((current) => normalizeLayoutPlacement({
      ...current,
      [key]: Number(value),
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
          mediaTexture={mediaElement ? layoutTexture : null}
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
        placement={layoutPlacement}
        panelOpen={layoutOpen}
        hasMedia={Boolean(mediaElement)}
        onPanelToggle={() => setLayoutOpen((value) => !value)}
        onPlacementChange={handleLayoutPlacementChange}
        onPlacementReset={() => setLayoutPlacement(DEFAULT_LAYOUT_PLACEMENT)}
      />

      <ControlPanel
        uv={uv}
        ao={ao}
        reflection={reflection}
        mode={mode}
        mediaName={mediaFile.name || "Test pattern"}
        playback={playback}
        hasMedia={Boolean(mediaFile.url)}
        canPlay={Boolean(videoElement)}
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
