import { useMemo } from "react";
import * as THREE from "three";

export function Furniture({ preset, mode }) {
  const materialSet = useMemo(
    () => ({
      fabric: new THREE.MeshStandardMaterial({
        color: mode === "light" ? "#4d6673" : "#203748",
        roughness: 0.86,
      }),
      wood: new THREE.MeshStandardMaterial({
        color: mode === "light" ? "#a07343" : "#5d402a",
        roughness: 0.72,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: mode === "light" ? "#565d61" : "#abb0ad",
        roughness: 0.38,
        metalness: 0.6,
      }),
    }),
    [mode],
  );

  const pieces = {
    minimal: ["bench", "table"],
    lounge: ["sofa", "table", "bench"],
    gallery: ["plinths", "bench", "rail"],
    event: ["sofa", "bar", "tables", "rail"],
  }[preset];

  return (
    <group>
      {pieces.includes("sofa") && <SofaModel position={[-2.8, 0.32, 1.8]} materialSet={materialSet} />}
      {pieces.includes("bench") && <Bench position={[2.5, 0.27, 1.35]} materialSet={materialSet} />}
      {pieces.includes("table") && <RoundTable position={[0.55, 0.36, 1.2]} materialSet={materialSet} />}
      {pieces.includes("tables") && (
        <>
          <RoundTable position={[1.9, 0.36, 0.8]} materialSet={materialSet} />
          <RoundTable position={[-1.2, 0.36, -0.2]} materialSet={materialSet} />
        </>
      )}
      {pieces.includes("plinths") && (
        <>
          <Plinth position={[-3.3, 0.42, -1.5]} mode={mode} />
          <Plinth position={[0, 0.42, -1.45]} mode={mode} />
          <Plinth position={[3.3, 0.42, -1.5]} mode={mode} />
        </>
      )}
      {pieces.includes("bar") && <Bar position={[3.4, 0.55, -1.1]} materialSet={materialSet} />}
      {pieces.includes("rail") && <LowRail mode={mode} />}
    </group>
  );
}

function SofaModel({ position, materialSet }) {
  return (
    <group position={position} rotation={[0, -0.22, 0]}>
      <mesh castShadow receiveShadow material={materialSet.fabric} position={[0, 0.22, 0]}>
        <boxGeometry args={[2.1, 0.44, 0.78]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.fabric} position={[0, 0.62, 0.38]}>
        <boxGeometry args={[2.18, 0.72, 0.2]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.fabric} position={[-1.14, 0.42, 0]}>
        <boxGeometry args={[0.18, 0.68, 0.82]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.fabric} position={[1.14, 0.42, 0]}>
        <boxGeometry args={[0.18, 0.68, 0.82]} />
      </mesh>
    </group>
  );
}

function Bench({ position, materialSet }) {
  return (
    <group position={position} rotation={[0, 0.36, 0]}>
      <mesh castShadow receiveShadow material={materialSet.wood} position={[0, 0.28, 0]}>
        <boxGeometry args={[1.9, 0.18, 0.52]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.metal} position={[-0.68, 0.11, -0.12]}>
        <boxGeometry args={[0.1, 0.22, 0.1]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.metal} position={[0.68, 0.11, 0.12]}>
        <boxGeometry args={[0.1, 0.22, 0.1]} />
      </mesh>
    </group>
  );
}

function RoundTable({ position, materialSet }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow material={materialSet.wood} position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.08, 36]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.metal} position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.28, 18]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.metal} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 24]} />
      </mesh>
    </group>
  );
}

function Plinth({ position, mode }) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={[0.72, 0.84, 0.72]} />
      <meshStandardMaterial color={mode === "light" ? "#dedbd2" : "#1d252d"} roughness={0.78} />
    </mesh>
  );
}

function Bar({ position, materialSet }) {
  return (
    <group position={position} rotation={[0, -0.55, 0]}>
      <mesh castShadow receiveShadow material={materialSet.wood} position={[0, 0.42, 0]}>
        <boxGeometry args={[2.2, 0.84, 0.44]} />
      </mesh>
      <mesh castShadow receiveShadow material={materialSet.metal} position={[0, 0.89, 0]}>
        <boxGeometry args={[2.3, 0.12, 0.5]} />
      </mesh>
    </group>
  );
}

function LowRail({ mode }) {
  const railMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mode === "light" ? "#414849" : "#9aa0a3",
        roughness: 0.4,
        metalness: 0.55,
      }),
    [mode],
  );

  return (
    <group position={[0, 0.48, 2.95]}>
      <mesh castShadow receiveShadow material={railMaterial}>
        <boxGeometry args={[7.8, 0.07, 0.07]} />
      </mesh>
      {[-3.6, -1.2, 1.2, 3.6].map((x) => (
        <mesh key={x} castShadow receiveShadow material={railMaterial} position={[x, -0.23, 0]}>
          <boxGeometry args={[0.07, 0.48, 0.07]} />
        </mesh>
      ))}
    </group>
  );
}
