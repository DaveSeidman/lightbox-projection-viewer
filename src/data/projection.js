export const PROJECTION_NAME_PATTERN =
  /projection|screen|plane|surface|video|mapped|canvas|display/i;

export const FURNITURE_NAME_PATTERN =
  /furniture|sofa|chair|table|bench|bar|stool|cabinet|counter|shelf/i;

export const PLANT_NAME_PATTERN = /plant|tree|fern|palm|foliage|greenery/i;

export const DEFAULT_UV = {
  offsetX: 0,
  offsetY: 0,
  repeatX: 1,
  repeatY: 1,
  rotation: 0,
  brightness: 1,
};

export const FURNITURE_PRESETS = [
  { id: "minimal", label: "Minimal" },
  { id: "lounge", label: "Lounge" },
  { id: "gallery", label: "Gallery" },
  { id: "event", label: "Event" },
];

export function animationClipId(clip, index) {
  return `${index}:${clip.name || "Untitled clip"}`;
}

export function animationClipLabel(clip, index) {
  const label = clip.name?.trim() || `Clip ${index + 1}`;
  return clip.duration ? `${label} (${clip.duration.toFixed(1)}s)` : label;
}

export const DEMO_PROJECTION_SEGMENTS = [
  {
    name: "Left wrap",
    start: 0,
    width: 0.25,
    position: [-5.96, 2.15, 0],
    rotation: [0, Math.PI / 2, 0],
    size: [8, 3.9],
  },
  {
    name: "Front wrap",
    start: 0.25,
    width: 0.25,
    position: [0, 2.15, -3.96],
    rotation: [0, 0, 0],
    size: [12, 3.9],
  },
  {
    name: "Right wrap",
    start: 0.5,
    width: 0.25,
    position: [5.96, 2.15, 0],
    rotation: [0, -Math.PI / 2, 0],
    size: [8, 3.9],
  },
  {
    name: "Rear wrap",
    start: 0.75,
    width: 0.25,
    position: [0, 2.15, 3.96],
    rotation: [0, Math.PI, 0],
    size: [12, 3.9],
  },
];
