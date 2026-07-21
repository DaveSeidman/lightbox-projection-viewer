import {
  Bounds,
  MeshReflectorMaterial,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import testPatternUrl from "../../test-pattern.png";
import { animationClipId } from "../data/projection.js";
import { DemoRoom } from "./DemoRoom.jsx";
import { UploadedModel } from "./UploadedModel.jsx";

const DEFAULT_MODEL_FOCUS = { x: 0, y: 1.45, z: 0 };
const ORBIT_FOCUS_DURATION = 0.45;

class ProjectionAwareGTAOPass extends GTAOPass {
  _renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha) {
    const hiddenObjects = [];

    this.scene.traverse((object) => {
      if (object.visible && object.userData?.excludeFromScreenSpaceAo) {
        object.visible = false;
        hiddenObjects.push(object);
      }
    });

    try {
      super._renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha);
    } finally {
      hiddenObjects.forEach((object) => {
        object.visible = true;
      });
    }
  }
}

export function ProjectionScene({
  mode,
  uv,
  ao,
  mediaTexture,
  modelUrl,
  showDemoRoom,
  showFurniture,
  showPlants,
  preset,
  cameraPath,
  onModelStats,
  onAnimationClips,
  onCameraPathEnd,
}) {
  const controls = useRef(null);
  const [modelRig, setModelRig] = useState(null);
  const [modelFocus, setModelFocus] = useState(DEFAULT_MODEL_FOCUS);
  const fallbackTexture = useTexture(testPatternUrl);
  fallbackTexture.colorSpace = THREE.SRGBColorSpace;
  fallbackTexture.wrapS = THREE.RepeatWrapping;
  fallbackTexture.wrapT = THREE.RepeatWrapping;

  const handleModelReady = useCallback((rig) => {
    setModelRig(rig);
    setModelFocus(rig?.scene ? getModelFocus(rig.scene) : DEFAULT_MODEL_FOCUS);
  }, []);

  useEffect(() => {
    if (!controls.current) return;
    controls.current.target.set(modelFocus.x, modelFocus.y, modelFocus.z);
    controls.current.update();
  }, [modelFocus]);

  return (
    <>
      <RendererTone mode={mode} />
      <StudioEnvironment mode={mode} />
      <CameraRig />
      <ambientLight intensity={mode === "light" ? 2.35 : 0.075} />
      <hemisphereLight
        args={[mode === "light" ? "#ffffff" : "#f6f7ff", mode === "light" ? "#f5f2e9" : "#080808", mode === "light" ? 0.95 : 0.055]}
      />
      <directionalLight
        castShadow
        position={[3.5, 7.5, 4]}
        intensity={mode === "light" ? 0.42 : 0}
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-2.4, 1.7, 0.2]} intensity={mode === "dark" ? 1.15 : 0.4} distance={7.2} decay={2} color="#f7f8ff" />
      <pointLight position={[2.2, 1.7, -0.2]} intensity={mode === "dark" ? 0.95 : 0.32} distance={7.2} decay={2} color="#fff7e8" />

      {showDemoRoom && (
        <DemoRoom
          mode={mode}
          uv={uv}
          texture={mediaTexture || fallbackTexture}
          showFurniture={showFurniture}
          showPlants={showPlants}
          preset={preset}
        />
      )}

      {modelUrl && (
        <Bounds fit clip margin={1.4}>
          <UploadedModel
            url={modelUrl}
            mode={mode}
            uv={uv}
            ao={ao}
            texture={mediaTexture || fallbackTexture}
            showFurniture={showFurniture}
            showPlants={showPlants}
            onStats={onModelStats}
            onReady={handleModelReady}
            onAnimationClips={onAnimationClips}
          />
        </Bounds>
      )}

      <ReflectiveFloor mode={mode} />
      <DoubleClickOrbitFocus controls={controls} />
      <ScreenSpaceAmbientOcclusion ao={ao} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.49}
        minDistance={0.12}
        maxDistance={18}
        ref={setControls}
      />
      <BlenderCameraClipController
        controls={controls}
        rig={modelRig}
        clipId={cameraPath?.id || ""}
        run={cameraPath?.run || 0}
        onComplete={onCameraPathEnd}
      />
    </>
  );

  function setControls(nextControls) {
    controls.current = nextControls;
    if (!nextControls || nextControls.userData?.initialTargetSet) return;
    nextControls.target.set(modelFocus.x, modelFocus.y, modelFocus.z);
    nextControls.update();
    nextControls.userData = { ...nextControls.userData, initialTargetSet: true };
  }
}

function getModelFocus(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  if (box.isEmpty() || !Number.isFinite(size.x + size.y + size.z)) {
    return DEFAULT_MODEL_FOCUS;
  }

  return {
    x: 0,
    y: box.min.y + size.y * 0.42,
    z: 0,
  };
}

function DoubleClickOrbitFocus({ controls }) {
  const { camera, pointer, raycaster, scene } = useThree();
  const animation = useRef(null);
  const start = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const nextTarget = useMemo(() => new THREE.Vector3(), []);

  const handleDoubleClick = useCallback((event) => {
    if (!controls.current) return;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(getFocusableMeshes(scene), true)[0];
    if (!hit) return;

    event.stopPropagation();
    start.copy(controls.current.target);
    target.copy(hit.point);
    animation.current = {
      elapsed: 0,
      start: start.clone(),
      target: target.clone(),
    };
  }, [camera, controls, pointer, raycaster, scene, start, target]);

  useFrame((_, delta) => {
    const state = animation.current;
    if (!state || !controls.current) return;

    state.elapsed += delta;
    const t = Math.min(state.elapsed / ORBIT_FOCUS_DURATION, 1);
    const eased = 1 - (1 - t) ** 3;

    nextTarget.lerpVectors(state.start, state.target, eased);
    controls.current.target.copy(nextTarget);
    controls.current.update();

    if (t >= 1) animation.current = null;
  });

  return <group onDoubleClick={handleDoubleClick} />;
}

function getFocusableMeshes(scene) {
  const meshes = [];

  scene.traverse((object) => {
    if (object.isMesh && object.visible && object.geometry && isFocusableMaterial(object.material)) {
      meshes.push(object);
    }
  });

  return meshes;
}

function isFocusableMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((item) => item && (!item.transparent || item.opacity > 0.01));
}

function RendererTone({ mode }) {
  const { gl } = useThree();

  useEffect(() => {
    const previousToneMapping = gl.toneMapping;
    const previousExposure = gl.toneMappingExposure;
    gl.toneMapping = THREE.NeutralToneMapping;

    return () => {
      gl.toneMapping = previousToneMapping;
      gl.toneMappingExposure = previousExposure;
    };
  }, [gl]);

  useEffect(() => {
    gl.toneMappingExposure = mode === "light" ? 1.04 : 0.92;
  }, [gl, mode]);

  return null;
}

function StudioEnvironment({ mode }) {
  const { gl, scene } = useThree();
  const previousIntensity = useRef(scene.environmentIntensity);

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnvironment = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
    const previousEnvironment = scene.environment;

    scene.environment = envMap;
    roomEnvironment.dispose();
    pmremGenerator.dispose();

    return () => {
      scene.environment = previousEnvironment;
      envMap.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environmentIntensity = mode === "light" ? 1.08 : 0.04;

    return () => {
      scene.environmentIntensity = previousIntensity.current;
    };
  }, [mode, scene]);

  return null;
}

function ScreenSpaceAmbientOcclusion({ ao }) {
  const { gl, scene, camera, size } = useThree();
  const { composer, gtaoPass, outputPass } = useMemo(() => {
    const nextComposer = new EffectComposer(gl);
    const nextGtaoPass = new ProjectionAwareGTAOPass(
      scene,
      camera,
      size.width,
      size.height,
      undefined,
      {
        samples: 16,
        screenSpaceRadius: false,
      },
      {
        samples: 16,
        rings: 2,
      },
    );
    const nextOutputPass = new OutputPass();

    nextComposer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.5));
    nextComposer.addPass(new RenderPass(scene, camera));
    nextComposer.addPass(nextGtaoPass);
    nextComposer.addPass(nextOutputPass);

    return {
      composer: nextComposer,
      gtaoPass: nextGtaoPass,
      outputPass: nextOutputPass,
    };
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.5));
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.height, size.width]);

  useEffect(() => {
    const opacity = THREE.MathUtils.clamp(ao?.opacity ?? 0, 0, 1);
    const blur = THREE.MathUtils.clamp(ao?.blur ?? 0, 0, 5);
    const distance = THREE.MathUtils.clamp(ao?.distance ?? 0.05, 0.05, 5);
    const area = THREE.MathUtils.clamp(ao?.area ?? 8, 4, 28);
    const areaScale = THREE.MathUtils.clamp(area / 15.3, 0.4, 2.2);

    gtaoPass.enabled = opacity > 0.001;
    gtaoPass.output = GTAOPass.OUTPUT.Default;
    gtaoPass.blendIntensity = THREE.MathUtils.clamp(opacity * 8.5, 0, 0.95);
    gtaoPass.updateGtaoMaterial({
      radius: THREE.MathUtils.clamp(distance * 1.35 * areaScale, 0.045, 0.85),
      distanceExponent: 1.25,
      thickness: THREE.MathUtils.clamp(distance * 3.4 * areaScale, 0.25, 2.6),
      distanceFallOff: THREE.MathUtils.clamp(0.72 / areaScale, 0.28, 1.15),
      scale: 1,
      samples: 16,
      screenSpaceRadius: false,
    });
    gtaoPass.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: THREE.MathUtils.clamp(blur * 9 + 1.5, 1.5, 18),
      radiusExponent: 2,
      rings: 2,
      samples: 16,
    });
  }, [ao, gtaoPass]);

  useEffect(() => {
    return () => {
      gtaoPass.dispose();
      outputPass.dispose();
      composer.dispose();
    };
  }, [composer, outputPass, gtaoPass]);

  useFrame((_, delta) => {
    composer.render(delta);
  }, 1);

  return null;
}

const CAMERA_RIG_NAME_PATTERN = /camera|cam|dolly|path|view|shot|rig/i;

function BlenderCameraClipController({ controls, rig, clipId, run, onComplete }) {
  const { camera } = useThree();
  const active = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!rig || !clipId) {
      active.current = null;
      if (controls.current) controls.current.enabled = true;
      return undefined;
    }

    const clipIndex = rig.animations.findIndex((clip, index) => animationClipId(clip, index) === clipId);
    const clip = rig.animations[clipIndex];
    const source = clip ? findCameraAnimationTarget(rig.scene, clip) : null;

    if (!clip || !source) {
      onCompleteRef.current?.();
      return undefined;
    }

    const mixer = new THREE.AnimationMixer(rig.scene);
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();

    active.current = {
      action,
      clip,
      elapsed: 0,
      mixer,
      source,
      completed: false,
    };

    if (controls.current) controls.current.enabled = false;

    return () => {
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(rig.scene);
      active.current = null;
      if (controls.current) controls.current.enabled = true;
    };
  }, [clipId, controls, rig, run]);

  useFrame((_, delta) => {
    if (!active.current || active.current.completed) return;

    const state = active.current;
    state.elapsed += delta;
    state.mixer.update(delta);
    copyCameraTransform(camera, state.source, position, quaternion);

    if (controls.current) {
      updateControlsTarget(controls.current, camera, forward);
    }

    if (state.elapsed >= state.clip.duration) {
      state.completed = true;
      onCompleteRef.current?.();
    }
  });

  return null;
}

function findCameraAnimationTarget(scene, clip) {
  const targetNames = collectClipTargetNames(clip);
  const animatedObjects = new Set();
  const cameras = [];

  scene.traverse((object) => {
    if (object.isCamera) cameras.push(object);
    if (targetNames.has(object.name) || targetNames.has(object.uuid)) {
      animatedObjects.add(object);
    }
  });

  const animatedCamera = cameras.find((camera) => isObjectOrAncestorInSet(camera, animatedObjects));
  if (animatedCamera) return animatedCamera;

  const namedAnimatedTarget = [...animatedObjects].find((object) => CAMERA_RIG_NAME_PATTERN.test(object.name));
  if (namedAnimatedTarget) return namedAnimatedTarget;

  return cameras.find((camera) => CAMERA_RIG_NAME_PATTERN.test(camera.name)) || null;
}

function collectClipTargetNames(clip) {
  const names = new Set();

  clip.tracks.forEach((track) => {
    try {
      const parsed = THREE.PropertyBinding.parseTrackName(track.name);
      if (parsed.nodeName) names.add(parsed.nodeName);
    } catch {
      // Fall back to a conservative split for unusual GLB track names.
    }

    const fallbackName = track.name.replace(/\.(position|quaternion|rotation|scale|fov|zoom).*$/i, "");
    if (fallbackName) names.add(fallbackName);
  });

  return names;
}

function isObjectOrAncestorInSet(object, candidates) {
  let current = object;
  while (current) {
    if (candidates.has(current)) return true;
    current = current.parent;
  }
  return false;
}

function copyCameraTransform(camera, source, position, quaternion) {
  source.updateWorldMatrix(true, false);
  source.getWorldPosition(position);
  source.getWorldQuaternion(quaternion);
  camera.position.copy(position);
  camera.quaternion.copy(quaternion);

  if (source.isPerspectiveCamera) {
    camera.fov = source.fov;
    camera.zoom = source.zoom;
  }

  camera.updateProjectionMatrix();
}

function updateControlsTarget(controls, camera, forward) {
  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  controls.target.copy(camera.position).addScaledVector(forward, 2);
  controls.update();
}

function ReflectiveFloor({ mode }) {
  return (
    <mesh
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.096, 0]}
    >
      <planeGeometry args={[11.5, 4.8]} />
      <MeshReflectorMaterial
        blur={[260, 70]}
        color={mode === "light" ? "#ece9de" : "#050506"}
        depthScale={mode === "light" ? 0.24 : 0.5}
        maxDepthThreshold={1.4}
        minDepthThreshold={0.18}
        mixBlur={1}
        mixStrength={mode === "light" ? 0.42 : 1.05}
        metalness={0}
        mirror={mode === "light" ? 0.48 : 0.82}
        resolution={1024}
        roughness={0.42}
      />
    </mesh>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (initialized.current) return;
    camera.lookAt(0, 1.55, 0);
    initialized.current = true;
  }, [camera]);

  return null;
}
