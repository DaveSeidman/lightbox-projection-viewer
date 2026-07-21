import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ProjectionScene } from "./ProjectionScene.jsx";

export function ProjectionCanvas(props) {
  const { mode } = props;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4.8, 2.7, 3.1], fov: 58, near: 0.1, far: 36 }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
    >
      <color attach="background" args={[mode === "light" ? "#f6f5ef" : "#07090d"]} />
      <Suspense fallback={<SceneFallback />}>
        <ProjectionScene {...props} />
      </Suspense>
    </Canvas>
  );
}

function SceneFallback() {
  return (
    <Html center className="projection-app__loading-badge">
      Loading
    </Html>
  );
}
