import {
  ChevronRight,
  Circle,
  Clapperboard,
  Flower2,
  Lightbulb,
  Play,
  Pause,
  Waves,
  RotateCcw,
  Sofa,
  Upload,
  Video,
} from "lucide-react";
import { DEFAULT_UV, FURNITURE_PRESETS } from "../data/projection.js";
import { Slider } from "./Slider.jsx";

export function ControlPanel({
  reflection,
  mode,
  mediaName,
  playback,
  hasMedia,
  canPlay,
  panelOpen,
  showFurniture,
  showPlants,
  preset,
  activeCameraPath,
  cameraClips,
  onMediaFile,
  onClearMedia,
  onPanelToggle,
  onPlaybackToggle,
  onReflectionChange,
  onReflectionReset,
  onShowFurnitureChange,
  onShowPlantsChange,
  onPresetChange,
  onCameraPath,
  onCameraCycle,
  onCameraStop,
}) {
  return (
    <aside
      className={`projection-controls${panelOpen ? "" : " projection-controls--collapsed"}`}
      aria-label="Projection controls"
    >
      <section className="projection-controls__section">
        <div className="projection-controls__section-title">
          <Video size={16} />
          <span>Media</span>
          <button
            className={`projection-controls__collapse-button${panelOpen ? " projection-controls__collapse-button--open" : ""}`}
            onClick={onPanelToggle}
            type="button"
            title={panelOpen ? "Collapse controls" : "Expand controls"}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {panelOpen && (
          <>
            <div className="projection-controls__file-actions">
              <label className="projection-controls__file-button">
                <Upload size={16} />
                <span>Upload media</span>
                <input
                  type="file"
                  accept="video/*,image/*"
                  multiple
                  onChange={onMediaFile}
                />
              </label>
            </div>
            <MediaRow label={mediaName} action="Reset" disabled={!hasMedia} onClick={onClearMedia} />
            <button
              className="projection-controls__play-button"
              onClick={onPlaybackToggle}
              type="button"
              disabled={!canPlay}
            >
              {playback === "playing" ? <Pause size={16} /> : <Play size={16} />}
              <span>{playback === "playing" ? "Pause Video" : "Play Video"}</span>
            </button>
          </>
        )}
      </section>

      {panelOpen && (
        <>
          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <Waves size={16} />
              <span>Reflection</span>
              <button className="projection-controls__ghost-button" onClick={onReflectionReset} type="button">
                Reset
              </button>
            </div>
            <Slider label="Blur" value={reflection.blur} min={0} max={6} step={0.01} onChange={(value) => onReflectionChange("blur", value)} />
            <Slider label="Strength" value={reflection.strength} min={0} max={2} step={0.01} onChange={(value) => onReflectionChange("strength", value)} />
          </section>

          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <Clapperboard size={16} />
              <span>Camera</span>
            </div>
            <label className="projection-controls__select-label" htmlFor="camera-clip-select">
              Clip
            </label>
            <select
              id="camera-clip-select"
              className="projection-controls__select"
              value={activeCameraPath}
              onChange={(event) => onCameraPath(event.target.value)}
              disabled={!cameraClips.length}
            >
              <option value="">
                {cameraClips.length ? "Manual camera" : "No Blender clips"}
              </option>
              {cameraClips.map((clip) => (
                <option key={clip.id} value={clip.id}>
                  {clip.label}
                </option>
              ))}
            </select>
            <div className="projection-controls__button-grid">
              <button
                className="projection-controls__secondary-button"
                onClick={onCameraCycle}
                type="button"
                disabled={!cameraClips.length}
              >
                Next clip
              </button>
              <button
                className="projection-controls__secondary-button"
                onClick={onCameraStop}
                type="button"
                disabled={!activeCameraPath}
              >
                Stop
              </button>
            </div>
          </section>

          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <Sofa size={16} />
              <span>Space</span>
              <Flower2 size={15} className="projection-controls__section-icon-secondary" />
            </div>
            <label className="projection-controls__check-row">
              <input
                type="checkbox"
                checked={showFurniture}
                onChange={(event) => onShowFurnitureChange(event.target.checked)}
              />
              <span>Furniture</span>
            </label>
            <label className="projection-controls__check-row">
              <input
                type="checkbox"
                checked={showPlants}
                onChange={(event) => onShowPlantsChange(event.target.checked)}
              />
              <span>Plants</span>
            </label>
            <label className="projection-controls__select-label" htmlFor="preset-select">
              Preset
            </label>
            <select
              id="preset-select"
              className="projection-controls__select"
              value={preset}
              onChange={(event) => onPresetChange(event.target.value)}
            >
              {FURNITURE_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="projection-controls__environment-note">
              {mode === "light" ? "White walls and floor" : "Dark reflective room"}
            </div>
          </section>
        </>
      )}

    </aside>
  );
}

export function DevPanel({
  ao,
  dof,
  modelLightIntensity,
  open,
  uv,
  onAoChange,
  onAoReset,
  onDofChange,
  onDofReset,
  onModelLightIntensityChange,
  onModelLightIntensityReset,
  onPanelToggle,
  onUvChange,
  onUvReset,
}) {
  return (
    <aside className={`projection-dev-controls${open ? "" : " projection-dev-controls--collapsed"}`} aria-label="Developer controls">
      <section className="projection-controls__section">
        <div className="projection-controls__section-title">
          <RotateCcw size={16} />
          <span>Dev</span>
          <button
            className={`projection-controls__collapse-button${open ? " projection-controls__collapse-button--open" : ""}`}
            onClick={onPanelToggle}
            type="button"
            title={open ? "Collapse dev controls" : "Expand dev controls"}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {open && (
        <>
          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <RotateCcw size={16} />
              <span>UV</span>
              <button className="projection-controls__ghost-button" onClick={onUvReset} type="button">
                Reset
              </button>
            </div>
            <Slider label="Offset X" value={uv.offsetX} min={-1} max={1} step={0.01} onChange={(value) => onUvChange("offsetX", value)} />
            <Slider label="Offset Y" value={uv.offsetY} min={-1} max={1} step={0.01} onChange={(value) => onUvChange("offsetY", value)} />
            <Slider label="Repeat X" value={uv.repeatX} min={0.25} max={4} step={0.01} onChange={(value) => onUvChange("repeatX", value)} />
            <Slider label="Repeat Y" value={uv.repeatY} min={0.25} max={4} step={0.01} onChange={(value) => onUvChange("repeatY", value)} />
            <Slider label="Brightness" value={uv.brightness} min={0.25} max={2.5} step={0.01} onChange={(value) => onUvChange("brightness", value)} />
          </section>

          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <Circle size={16} />
              <span>AO</span>
              <button className="projection-controls__ghost-button" onClick={onAoReset} type="button">
                Reset
              </button>
            </div>
            <Slider label="Opacity" value={ao.opacity} min={0} max={0.18} step={0.01} onChange={(value) => onAoChange("opacity", value)} />
            <Slider label="Blur" value={ao.blur} min={0} max={0.22} step={0.01} onChange={(value) => onAoChange("blur", value)} />
            <Slider label="Distance" value={ao.distance} min={0.05} max={0.73} step={0.01} onChange={(value) => onAoChange("distance", value)} />
            <Slider label="Area" value={ao.area} min={4} max={24.8} step={0.1} onChange={(value) => onAoChange("area", value)} />
          </section>

          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <Lightbulb size={16} />
              <span>Model Lights</span>
              <button className="projection-controls__ghost-button" onClick={onModelLightIntensityReset} type="button">
                Reset
              </button>
            </div>
            <Slider label="Intensity" value={modelLightIntensity} min={0} max={6} step={0.01} onChange={onModelLightIntensityChange} />
          </section>

          <section className="projection-controls__section">
            <div className="projection-controls__section-title">
              <Circle size={16} />
              <span>DOF</span>
              <button className="projection-controls__ghost-button" onClick={onDofReset} type="button">
                Reset
              </button>
            </div>
            <Slider label="Focus" value={dof.focus} min={0.8} max={12} step={0.1} onChange={(value) => onDofChange("focus", value)} />
            <Slider label="Aperture" value={dof.aperture} min={0} max={0.002} step={0.00001} onChange={(value) => onDofChange("aperture", value)} />
            <Slider label="Blur" value={dof.maxblur} min={0} max={0.02} step={0.0001} onChange={(value) => onDofChange("maxblur", value)} />
            <Slider label="Noise" value={dof.noise} min={0} max={0.18} step={0.001} onChange={(value) => onDofChange("noise", value)} />
          </section>
        </>
      )}
    </aside>
  );
}

function MediaRow({ label, action, disabled, onClick }) {
  return (
    <div className="projection-controls__media-row">
      <span>{label}</span>
      <button onClick={onClick} type="button" disabled={disabled}>
        {action}
      </button>
    </div>
  );
}
