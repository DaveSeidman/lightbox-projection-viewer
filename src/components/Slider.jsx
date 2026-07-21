function formatValue(value, step, suffix) {
  return `${Number(value).toFixed(step >= 1 ? 0 : 2)}${suffix}`;
}

export function Slider({ label, value, min, max, step, onChange, suffix = "" }) {
  return (
    <label className="projection-controls__slider">
      <span className="projection-controls__slider-label">{label}</span>
      <input
        className="projection-controls__range"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
      <output className="projection-controls__slider-value">
        {formatValue(value, step, suffix)}
      </output>
    </label>
  );
}
