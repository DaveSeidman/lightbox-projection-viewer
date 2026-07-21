import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { DEMO_PROJECTION_SEGMENTS } from "../data/projection.js";
import { useProjectedTexture } from "../hooks/useProjectedTexture.js";
import { Furniture } from "./Furniture.jsx";
import { Plants } from "./Plants.jsx";

export function DemoRoom({ mode, uv, texture, showFurniture, showPlants, preset }) {
  const wallColor = mode === "light" ? "#f7f5ef" : "#121820";
  const trimColor = mode === "light" ? "#d6d2c7" : "#283445";

  return (
    <group>
      <Floor mode={mode} />
      <mesh receiveShadow position={[0, 2, -4]}>
        <boxGeometry args={[12.2, 4, 0.08]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[0, 2, 4]}>
        <boxGeometry args={[12.2, 4, 0.08]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[-6, 2, 0]}>
        <boxGeometry args={[0.08, 4, 8.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[6, 2, 0]}>
        <boxGeometry args={[0.08, 4, 8.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[0, 4.02, 0]}>
        <boxGeometry args={[12.2, 0.08, 8.2]} />
        <meshStandardMaterial color={mode === "light" ? "#ece9df" : "#0e131a"} roughness={0.9} />
      </mesh>
      <RoomTrim color={trimColor} />

      {DEMO_PROJECTION_SEGMENTS.map((segment) => (
        <ProjectedPlane
          key={segment.name}
          name={segment.name}
          texture={texture}
          uv={uv}
          segment={segment}
          mode={mode}
        />
      ))}

      {showFurniture && <Furniture preset={preset} mode={mode} />}
      {showPlants && <Plants preset={preset} mode={mode} />}
    </group>
  );
}

function Floor({ mode }) {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[12.3, 8.3]} />
      {mode === "dark" ? (
        <MeshReflectorMaterial
          color="#090d12"
          roughness={0.42}
          metalness={0.18}
          mirror={0.46}
          mixBlur={1.2}
          mixStrength={1.1}
          resolution={768}
          blur={[280, 90]}
          depthScale={0.18}
        />
      ) : (
        <meshStandardMaterial color="#eee9dc" roughness={0.58} />
      )}
    </mesh>
  );
}

function RoomTrim({ color }) {
  return (
    <>
      <mesh position={[0, 0.08, -3.91]}>
        <boxGeometry args={[12, 0.14, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.08, 3.91]}>
        <boxGeometry args={[12, 0.14, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-5.91, 0.08, 0]}>
        <boxGeometry args={[0.12, 0.14, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[5.91, 0.08, 0]}>
        <boxGeometry args={[0.12, 0.14, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

function ProjectedPlane({ name, texture, uv, segment, mode }) {
  const localTexture = useProjectedTexture(texture, uv, segment);

  return (
    <mesh name={name} position={segment.position} rotation={segment.rotation} renderOrder={4}>
      <planeGeometry args={segment.size} />
      <meshStandardMaterial
        map={localTexture}
        emissiveMap={localTexture}
        emissive="#ffffff"
        emissiveIntensity={mode === "dark" ? 0.92 * uv.brightness : 0.34 * uv.brightness}
        roughness={0.72}
        metalness={0}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
