export function Plants({ preset, mode }) {
  const positions = {
    minimal: [[-4.8, 0, 2.8]],
    lounge: [[-4.9, 0, 2.75], [4.7, 0, 2.55]],
    gallery: [[-4.9, 0, 2.75], [4.9, 0, 2.75], [0, 0, 2.9]],
    event: [[-4.8, 0, 2.7], [4.8, 0, 2.7], [-5, 0, -2.6], [5, 0, -2.6]],
  }[preset];

  return (
    <group>
      {positions.map((position, index) => (
        <Plant key={`${position.join("-")}-${index}`} position={position} mode={mode} />
      ))}
    </group>
  );
}

function Plant({ position, mode }) {
  const leafColor = mode === "light" ? "#2e6f57" : "#4c8a68";
  const potColor = mode === "light" ? "#b86d43" : "#6c4735";

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.36, 18]} />
        <meshStandardMaterial color={potColor} roughness={0.82} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.55, 8]} />
        <meshStandardMaterial color="#466040" roughness={0.72} />
      </mesh>
      {[0, 1, 2, 3, 4].map((leaf) => (
        <mesh
          key={leaf}
          castShadow
          receiveShadow
          position={[
            Math.cos(leaf * 1.26) * 0.18,
            0.78 + (leaf % 2) * 0.08,
            Math.sin(leaf * 1.26) * 0.18,
          ]}
          rotation={[0.42, leaf * 1.26, 0.22]}
        >
          <sphereGeometry args={[0.2, 16, 8]} />
          <meshStandardMaterial color={leafColor} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
