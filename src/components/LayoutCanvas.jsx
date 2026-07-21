import { ChevronRight, Maximize2, Move } from "lucide-react";
import { useEffect, useRef } from "react";
import { LAYOUT_HEIGHT, LAYOUT_WIDTH } from "../hooks/useLayoutTexture.js";

const outlineModules = import.meta.glob("../assets/images/*.{avif,gif,jpeg,jpg,png,svg,webp}", {
  eager: true,
  import: "default",
  query: "?url",
});

export const DEFAULT_OUTLINE_URL = Object.values(outlineModules)[0] || "";

export function LayoutCanvas({
  layoutCanvas,
  outlineUrl,
  placement,
  panelOpen,
  hasMedia,
  onPanelToggle,
  onPlacementChange,
  onPlacementReset,
}) {
  const previewRef = useRef(null);

  const previewStyle = {
    "--media-x": `${(placement.x / LAYOUT_WIDTH) * 100}%`,
    "--media-y": `${(placement.y / LAYOUT_HEIGHT) * 100}%`,
    "--media-width": `${(placement.width / LAYOUT_WIDTH) * 100}%`,
    "--media-height": `${(placement.height / LAYOUT_HEIGHT) * 100}%`,
  };

  return (
    <section className={`layout-canvas${panelOpen ? "" : " layout-canvas--collapsed"}`}>
      <div className="layout-canvas__title">
        <Move size={16} />
        <span>Layout</span>
        <button
          className={`layout-canvas__collapse-button${panelOpen ? " layout-canvas__collapse-button--open" : ""}`}
          onClick={onPanelToggle}
          type="button"
          title={panelOpen ? "Collapse layout canvas" : "Expand layout canvas"}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {panelOpen && (
        <>
          <div
            ref={previewRef}
            className={`layout-canvas__preview${hasMedia ? "" : " layout-canvas__preview--empty"}`}
            style={previewStyle}
          >
            {outlineUrl && (
              <img className="layout-canvas__outline" src={outlineUrl} alt="" draggable="false" />
            )}
            {layoutCanvas && <PreviewCompositeCanvas source={layoutCanvas} />}
            <div
              className="layout-canvas__media-box"
              onPointerDown={(event) => beginPlacementDrag(event, "move", previewRef.current, placement, onPlacementChange)}
            >
              <span>{hasMedia ? "Media" : "Upload media"}</span>
              <button
                className="layout-canvas__resize-handle"
                onPointerDown={(event) => beginPlacementDrag(event, "resize", previewRef.current, placement, onPlacementChange)}
                type="button"
                title="Resize media"
              />
            </div>
          </div>

          <div className="layout-canvas__controls">
            <NumberField label="X" value={placement.x} min={0} max={LAYOUT_WIDTH} step={10} onChange={(value) => onPlacementChange("x", value)} />
            <NumberField label="Y" value={placement.y} min={0} max={LAYOUT_HEIGHT} step={2} onChange={(value) => onPlacementChange("y", value)} />
            <NumberField label="W" value={placement.width} min={20} max={LAYOUT_WIDTH} step={10} onChange={(value) => onPlacementChange("width", value)} />
            <NumberField label="H" value={placement.height} min={20} max={LAYOUT_HEIGHT} step={2} onChange={(value) => onPlacementChange("height", value)} />
            <button className="layout-canvas__reset-button" onClick={onPlacementReset} type="button">
              <Maximize2 size={14} />
              <span>Reset</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function NumberField({ label, value, min, max, step, onChange }) {
  return (
    <label className="layout-canvas__number-field">
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PreviewCompositeCanvas({ source }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const target = canvasRef.current;
    if (!source || !target) return undefined;
    let frameId = 0;
    const context = target.getContext("2d");
    if (!context) return undefined;

    const draw = () => {
      context.clearRect(0, 0, target.width, target.height);
      context.drawImage(source, 0, 0, target.width, target.height);
      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [source]);

  return (
    <canvas
      className="layout-canvas__composite"
      width={LAYOUT_WIDTH}
      height={LAYOUT_HEIGHT}
      ref={canvasRef}
    />
  );
}

function beginPlacementDrag(event, mode, preview, placement, onPlacementChange) {
  if (!preview) return;
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.setPointerCapture?.(event.pointerId);

  const start = {
    clientX: event.clientX,
    clientY: event.clientY,
    placement: { ...placement },
  };

  const move = (nextEvent) => {
    const box = preview.getBoundingClientRect();
    const dx = ((nextEvent.clientX - start.clientX) / box.width) * LAYOUT_WIDTH;
    const dy = ((nextEvent.clientY - start.clientY) / box.height) * LAYOUT_HEIGHT;

    if (mode === "resize") {
      onPlacementChange("width", start.placement.width + dx);
      onPlacementChange("height", start.placement.height + dy);
      return;
    }

    onPlacementChange("x", start.placement.x + dx);
    onPlacementChange("y", start.placement.y + dy);
  };

  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end, { once: true });
}
