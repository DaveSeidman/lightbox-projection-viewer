import { ChevronRight, Maximize2, Move } from "lucide-react";
import { useEffect, useRef } from "react";
import wallsUvMapUrl from "../assets/images/walls-uv-map.png";
import { LAYOUT_HEIGHT, LAYOUT_WIDTH } from "../hooks/useLayoutTexture.js";

export const DEFAULT_OUTLINE_URL = wallsUvMapUrl;

export function LayoutCanvas({
  layoutCanvas,
  outlineUrl,
  mediaItems,
  placements,
  activeMediaId,
  panelOpen,
  hasMedia,
  onActiveMediaChange,
  onPanelToggle,
  onPlacementChange,
  onPlacementReset,
}) {
  const previewRef = useRef(null);
  const activeItem = mediaItems.find((item) => item.id === activeMediaId) || mediaItems[0] || null;
  const activePlacement = activeItem ? placements[activeItem.id] : null;

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
          >
            {outlineUrl && (
              <img className="layout-canvas__outline" src={outlineUrl} alt="" draggable="false" />
            )}
            {layoutCanvas && <PreviewCompositeCanvas source={layoutCanvas} />}
            {mediaItems.map((item) => {
              const placement = placements[item.id];
              if (!placement) return null;

              return (
                <div
                  key={item.id}
                  className={`layout-canvas__media-box${item.id === activeItem?.id ? " layout-canvas__media-box--active" : ""}`}
                  onPointerDown={(event) => {
                    onActiveMediaChange(item.id);
                    beginPlacementDrag(event, "move", item.id, previewRef.current, placement, onPlacementChange);
                  }}
                  style={mediaBoxStyle(placement)}
                >
                  <span>{item.name}</span>
                  <button
                    className="layout-canvas__resize-handle"
                    onPointerDown={(event) => {
                      onActiveMediaChange(item.id);
                      beginPlacementDrag(event, "resize", item.id, previewRef.current, placement, onPlacementChange);
                    }}
                    type="button"
                    title={`Resize ${item.name}`}
                  />
                </div>
              );
            })}
          </div>

          {mediaItems.length > 0 && (
            <div className="layout-canvas__layers">
              {mediaItems.map((item, index) => (
                <button
                  key={item.id}
                  className={`layout-canvas__layer-button${item.id === activeItem?.id ? " layout-canvas__layer-button--active" : ""}`}
                  onClick={() => onActiveMediaChange(item.id)}
                  type="button"
                  title={item.name}
                >
                  <span>{index + 1}</span>
                  <strong>{item.name}</strong>
                </button>
              ))}
            </div>
          )}

          {activeItem && activePlacement && (
            <div className="layout-canvas__controls">
              <NumberField label="X" value={activePlacement.x} min={0} max={LAYOUT_WIDTH} step={10} onChange={(value) => onPlacementChange(activeItem.id, "x", value)} />
              <NumberField label="Y" value={activePlacement.y} min={0} max={LAYOUT_HEIGHT} step={2} onChange={(value) => onPlacementChange(activeItem.id, "y", value)} />
              <NumberField label="W" value={activePlacement.width} min={20} max={LAYOUT_WIDTH} step={10} onChange={(value) => onPlacementChange(activeItem.id, "width", value)} />
              <NumberField label="H" value={activePlacement.height} min={20} max={LAYOUT_HEIGHT} step={2} onChange={(value) => onPlacementChange(activeItem.id, "height", value)} />
              <button className="layout-canvas__reset-button" onClick={onPlacementReset} type="button">
                <Maximize2 size={14} />
                <span>Reset</span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function mediaBoxStyle(placement) {
  return {
    "--media-x": `${(placement.x / LAYOUT_WIDTH) * 100}%`,
    "--media-y": `${(placement.y / LAYOUT_HEIGHT) * 100}%`,
    "--media-width": `${(placement.width / LAYOUT_WIDTH) * 100}%`,
    "--media-height": `${(placement.height / LAYOUT_HEIGHT) * 100}%`,
  };
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

function beginPlacementDrag(event, mode, id, preview, placement, onPlacementChange) {
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
      onPlacementChange(id, "width", start.placement.width + dx);
      onPlacementChange(id, "height", start.placement.height + dy);
      return;
    }

    onPlacementChange(id, "x", start.placement.x + dx);
    onPlacementChange(id, "y", start.placement.y + dy);
  };

  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end, { once: true });
}
