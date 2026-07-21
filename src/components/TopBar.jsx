import { Clapperboard, Moon, Sun } from "lucide-react";

export function TopBar({ mode, onModeChange }) {
  return (
    <header className="projection-app__topbar">
      <div className="projection-app__brand">
        <Clapperboard size={20} />
        <span>Lightbox Projection Visualizer <sup>TM</sup></span>
      </div>

      <div className="projection-app__mode-switch" aria-label="Environment mode">
        <button
          className={`projection-app__mode-button${mode === "light" ? " projection-app__mode-button--active" : ""}`}
          onClick={() => onModeChange("light")}
          type="button"
          title="Light environment"
        >
          <Sun size={16} />
          <span>Light</span>
        </button>
        <button
          className={`projection-app__mode-button${mode === "dark" ? " projection-app__mode-button--active" : ""}`}
          onClick={() => onModeChange("dark")}
          type="button"
          title="Dark environment"
        >
          <Moon size={16} />
          <span>Dark</span>
        </button>
      </div>
    </header>
  );
}
