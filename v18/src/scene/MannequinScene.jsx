import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { GENDER_BASE_MEASUREMENTS_CM } from '../data'

const LOCAL_MODEL_URLS = [
  '/assets/models/empty.glb',
  '/assets/models/mannequin.glb',
  '/assets/models/top_shirt.glb',
  '/assets/models/top_tee.glb',
  '/assets/models/outer_bomber.glb',
  '/assets/models/outer_blazer.glb',
  '/assets/models/outer_coat.glb',
  '/assets/models/bottom_cargo.glb',
  '/assets/models/bottom_denim.glb',
  '/assets/models/bottom_shorts.glb',
  '/assets/models/shoes_sneaker.glb',
  '/assets/models/shoes_boot.glb',
  '/assets/models/shoes_runner.glb',
]

LOCAL_MODEL_URLS.forEach((url) => useGLTF.preload(url))

const ALIASES = {
  hips: ['hips', 'pelvis', 'mixamorrighips', 'mixamorighips'],
  spine: ['spine', 'spinelower', 'spine1'],
  chest: ['chest', 'spine2', 'spineupper', 'upperchest'],
  neck: ['neck'],
  head: ['head'],
  leftShoulder: ['leftshoulder', 'lshoulder'],
  rightShoulder: ['rightshoulder', 'rshoulder'],
  leftUpperArm: ['leftupperarm', 'leftarm'],
  rightUpperArm: ['rightupperarm', 'rightarm'],
  leftLowerArm: ['leftforearm', 'leftlowerarm'],
  rightLowerArm: ['rightforearm', 'rightlowerarm'],
  leftHand: ['lefthand'],
  rightHand: ['righthand'],
  leftUpperLeg: ['leftupleg', 'leftupperleg', 'leftthigh'],
  rightUpperLeg: ['rightupleg', 'rightupperleg', 'rightthigh'],
  leftLowerLeg: ['leftleg', 'leftlowerleg', 'leftcalf', 'leftshin'],
  rightLowerLeg: ['rightleg', 'rightlowerleg', 'rightcalf', 'rightshin'],
  leftFoot: ['leftfoot'],
  rightFoot: ['rightfoot'],
}

const Y_AXIS = new THREE.Vector3(0, 1, 0)

function normalizeBoneName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findSkinnedMeshes(root) {
  const found = []
  root.traverse((obj) => {
    if (obj.isSkinnedMesh) found.push(obj)
  })
  return found
}

function findBones(root) {
  const bones = []
  root.traverse((obj) => {
    if (obj.isBone) bones.push(obj)
  })
  return bones
}

function aliasMapFromRoot(root) {
  const allBones = findBones(root)
  const normalized = allBones.map((bone) => [normalizeBoneName(bone.name), bone])
  return Object.fromEntries(Object.entries(ALIASES).map(([key, patterns]) => {
    const bone = patterns.map((pattern) => normalized.find(([name]) => name.includes(pattern))?.[1]).find(Boolean) || null
    return [key, bone]
  }))
}

function captureInitialState(aliasMap) {
  return Object.fromEntries(
    Object.entries(aliasMap)
      .filter(([, bone]) => bone)
      .map(([key, bone]) => [key, {
        position: bone.position.clone(),
        scale: bone.scale.clone(),
        rotation: bone.rotation.clone(),
      }]),
  )
}

function restoreInitialState(aliasMap, initialState) {
  Object.entries(initialState || {}).forEach(([key, state]) => {
    const bone = aliasMap[key]
    if (!bone || !state) return
    bone.position.copy(state.position)
    bone.scale.copy(state.scale)
    bone.rotation.copy(state.rotation)
  })
}

function applySizeControls(aliasMap, initialState, measurements, gender) {
  if (!initialState) return
  restoreInitialState(aliasMap, initialState)

  const base = GENDER_BASE_MEASUREMENTS_CM[gender] || GENDER_BASE_MEASUREMENTS_CM.female
  const shoulderFactor = THREE.MathUtils.clamp(measurements.shoulderWidth / base.shoulderWidth, 0.82, 1.28)
  const waistFactor = THREE.MathUtils.clamp(measurements.waist / base.waist, 0.78, 1.34)
  const headFactor = THREE.MathUtils.clamp(measurements.headCircumference / base.headCircumference, 0.86, 1.2)
  const legFactor = THREE.MathUtils.clamp(measurements.legLength / base.legLength, 0.82, 1.22)
  const armFactor = THREE.MathUtils.clamp(measurements.armLength / base.armLength, 0.84, 1.22)
  const femaleBias = gender === 'female' ? 1 : 0

  const chest = aliasMap.chest
  const spine = aliasMap.spine
  const hips = aliasMap.hips
  const head = aliasMap.head
  const leftShoulder = aliasMap.leftShoulder
  const rightShoulder = aliasMap.rightShoulder

  if (chest) chest.scale.set(shoulderFactor * (femaleBias ? 0.96 : 1.04), 1, shoulderFactor * 0.95)
  if (spine) spine.scale.set((shoulderFactor + waistFactor) * 0.5, 1, waistFactor * 0.98)
  if (hips) hips.scale.set(waistFactor * (femaleBias ? 1.06 : 0.98), 1, waistFactor * (femaleBias ? 1.08 : 0.98))
  if (head) head.scale.setScalar(headFactor)

  if (leftShoulder && initialState.leftShoulder) leftShoulder.position.x = initialState.leftShoulder.position.x * shoulderFactor
  if (rightShoulder && initialState.rightShoulder) rightShoulder.position.x = initialState.rightShoulder.position.x * shoulderFactor

  const stretchBones = (keys, factor, damp = 1) => {
    keys.forEach((key) => {
      const bone = aliasMap[key]
      const state = initialState[key]
      if (!bone || !state) return
      bone.position.copy(state.position.clone().multiplyScalar(1 + (factor - 1) * damp))
    })
  }

  stretchBones(['leftUpperArm', 'rightUpperArm'], armFactor, 0.5)
  stretchBones(['leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand'], armFactor, 1)
  stretchBones(['leftUpperLeg', 'rightUpperLeg'], legFactor, 0.56)
  stretchBones(['leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'], legFactor, 1)
}

function applyPose(aliasMap, initialState, poseId = 'apose') {
  if (!initialState) return
  Object.entries(initialState).forEach(([key, state]) => {
    const bone = aliasMap[key]
    if (!bone || !state) return
    bone.rotation.copy(state.rotation)
  })

  const setZ = (key, degrees) => {
    if (aliasMap[key]) aliasMap[key].rotation.z += THREE.MathUtils.degToRad(degrees)
  }
  const setX = (key, degrees) => {
    if (aliasMap[key]) aliasMap[key].rotation.x += THREE.MathUtils.degToRad(degrees)
  }
  const setY = (key, degrees) => {
    if (aliasMap[key]) aliasMap[key].rotation.y += THREE.MathUtils.degToRad(degrees)
  }

  switch (poseId) {
    case 'tpose':
      setZ('leftUpperArm', 90)
      setZ('rightUpperArm', -90)
      break
    case 'relaxed':
      setZ('leftUpperArm', 18)
      setZ('rightUpperArm', -18)
      setZ('leftLowerArm', 3)
      setZ('rightLowerArm', -3)
      setY('hips', 4)
      setX('leftUpperLeg', -2)
      setX('rightUpperLeg', 1)
      setY('head', -4)
      break
    case 'contrapposto':
      setZ('leftUpperArm', 24)
      setZ('rightUpperArm', -14)
      setZ('leftLowerArm', 6)
      setY('hips', 9)
      setY('chest', -7)
      setX('leftUpperLeg', -4)
      setX('rightUpperLeg', 3)
      setY('head', -6)
      break
    case 'walk':
      setZ('leftUpperArm', 36)
      setZ('rightUpperArm', -22)
      setX('leftUpperLeg', 8)
      setX('rightUpperLeg', -8)
      setX('leftLowerLeg', -6)
      setX('rightLowerLeg', 5)
      break
    case 'handsonhips':
      setZ('leftUpperArm', 55)
      setZ('rightUpperArm', -55)
      setY('leftUpperArm', -18)
      setY('rightUpperArm', 18)
      setZ('leftLowerArm', 48)
      setZ('rightLowerArm', -48)
      setY('hips', 6)
      setY('head', -2)
      break
    case 'apose':
    default:
      setZ('leftUpperArm', 58)
      setZ('rightUpperArm', -58)
      setZ('leftLowerArm', 6)
      setZ('rightLowerArm', -6)
      break
  }
}

function configureMaterials(root) {
  root.traverse((obj) => {
    if (obj.isMesh || obj.isSkinnedMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
      obj.frustumCulled = false
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        if (!mat) return
        mat.side = THREE.FrontSide
        if ('roughness' in mat) mat.roughness = Math.min(1, Math.max(0.28, mat.roughness ?? 0.86))
        if ('metalness' in mat) mat.metalness = Math.min(0.1, mat.metalness ?? 0.02)
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.9
        mat.needsUpdate = true
      })
    }
  })
}

function setBodyOpacity(root, opacity = 1) {
  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return
    obj.frustumCulled = false
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    mats.forEach((mat) => {
      if (!mat) return
      mat.transparent = opacity < 0.98
      mat.opacity = opacity
      mat.depthWrite = opacity > 0.16
      mat.colorWrite = opacity > 0.02
      mat.needsUpdate = true
    })
  })
}

function makeReboundClothingMeshes(clothingScene, baseSkinned) {
  if (!clothingScene || !baseSkinned?.skeleton) return []
  const skinnedMeshes = findSkinnedMeshes(clothingScene)
  return skinnedMeshes.map((skinned) => {
    const geometry = skinned.geometry.clone()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const material = Array.isArray(skinned.material)
      ? skinned.material.map((mat) => mat.clone())
      : skinned.material.clone()
    const rebound = new THREE.SkinnedMesh(geometry, material)
    rebound.name = `${skinned.name || 'clothing'}_rebound`
    rebound.bind(baseSkinned.skeleton, baseSkinned.bindMatrix.clone())
    rebound.frustumCulled = false
    rebound.castShadow = true
    rebound.receiveShadow = true
    rebound.renderOrder = 2
    return rebound
  })
}

function fitCamera(camera, controls, size) {
  const aspect = size.width / Math.max(size.height, 1)
  const distance = aspect < 1.0 ? 6.8 : aspect < 1.3 ? 6.1 : 5.45
  const fov = aspect < 1.0 ? 28 : aspect < 1.3 ? 24 : 22
  const targetY = 0.94
  const cameraY = 1.18

  camera.fov = fov
  camera.position.set(0, cameraY, distance)
  camera.lookAt(0, targetY, 0)
  camera.updateProjectionMatrix()

  if (controls) {
    controls.target.set(0, targetY, 0)
    controls.minDistance = distance - 1.0
    controls.maxDistance = distance + 2.0
    controls.minAzimuthAngle = -Math.PI * 0.18
    controls.maxAzimuthAngle = Math.PI * 0.18
    controls.maxPolarAngle = Math.PI / 2.02
    controls.minPolarAngle = Math.PI / 2.7
    controls.enablePan = false
    controls.update()
  }
}

function CameraRig({ controlsRef }) {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    fitCamera(camera, controlsRef.current, size)
  }, [camera, size, controlsRef])
  return null
}

function StudioBackdrop({ theme }) {
  return (
    <group>
      <mesh position={[0, 3.3, -3.3]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color={theme.wall} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[7.6, 96]} />
        <meshStandardMaterial color={theme.floor} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <ringGeometry args={[1.8, 4.8, 96]} />
        <meshBasicMaterial color={theme.ring} transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, 4.5, -5.2]}>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshBasicMaterial color={theme.glow} transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

function computeBodyFitInfo(root) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  return {
    height: Math.max(size.y, 0.0001),
    centerX: center.x,
    centerZ: center.z,
    minY: box.min.y,
  }
}

function applyFixedBodyFit(wrapperRef, fitInfo, targetHeightMeters) {
  if (!wrapperRef.current || !fitInfo) return
  const scale = targetHeightMeters / fitInfo.height
  wrapperRef.current.scale.setScalar(scale)
  wrapperRef.current.position.set(-fitInfo.centerX * scale, -fitInfo.minY * scale, -fitInfo.centerZ * scale)
}

function setSegment(mesh, a, b, rx, rz = rx) {
  if (!mesh || !a || !b) return
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  if (len < 1e-5) {
    mesh.visible = false
    return
  }
  mesh.visible = true
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  mesh.position.copy(mid)
  mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize())
  mesh.scale.set(rx, len, rz)
}

function setEllipsoid(mesh, center, sx, sy, sz) {
  if (!mesh || !center) return
  mesh.visible = true
  mesh.position.copy(center)
  mesh.rotation.set(0, 0, 0)
  mesh.scale.set(sx, sy, sz)
}

function setBox(mesh, center, sx, sy, sz) {
  if (!mesh || !center) return
  mesh.visible = true
  mesh.position.copy(center)
  mesh.scale.set(sx, sy, sz)
}

function HumanOverlay({ aliasMap, wrapperRef, measurements, gender }) {
  const pelvisRef = useRef()
  const torsoRef = useRef()
  const chestRef = useRef()
  const neckRef = useRef()
  const headRef = useRef()
  const hairRef = useRef()
  const leftUpperArmRef = useRef()
  const rightUpperArmRef = useRef()
  const leftLowerArmRef = useRef()
  const rightLowerArmRef = useRef()
  const leftUpperLegRef = useRef()
  const rightUpperLegRef = useRef()
  const leftLowerLegRef = useRef()
  const rightLowerLegRef = useRef()
  const leftHandRef = useRef()
  const rightHandRef = useRef()
  const leftFootRef = useRef()
  const rightFootRef = useRef()

  const base = GENDER_BASE_MEASUREMENTS_CM[gender] || GENDER_BASE_MEASUREMENTS_CM.female
  const shoulderFactor = THREE.MathUtils.clamp(measurements.shoulderWidth / base.shoulderWidth, 0.82, 1.28)
  const waistFactor = THREE.MathUtils.clamp(measurements.waist / base.waist, 0.78, 1.34)
  const headFactor = THREE.MathUtils.clamp(measurements.headCircumference / base.headCircumference, 0.86, 1.2)
  const female = gender === 'female'

  const skinColor = useMemo(() => new THREE.Color(female ? '#efc9b6' : '#c89776'), [female])
  const hairColor = useMemo(() => new THREE.Color(female ? '#4c3a34' : '#2f2e31'), [female])
  const underColor = useMemo(() => new THREE.Color(female ? '#d8dbe6' : '#c8ced9'), [female])

  useFrame(() => {
    if (!wrapperRef.current || !aliasMap.hips) return
    const toLocal = (bone, offset) => {
      if (!bone) return null
      const out = new THREE.Vector3()
      bone.getWorldPosition(out)
      wrapperRef.current.worldToLocal(out)
      if (offset) out.add(offset)
      return out
    }

    const hips = toLocal(aliasMap.hips)
    const spine = toLocal(aliasMap.spine)
    const chest = toLocal(aliasMap.chest)
    const neck = toLocal(aliasMap.neck)
    const head = toLocal(aliasMap.head)
    const lShoulder = toLocal(aliasMap.leftShoulder)
    const rShoulder = toLocal(aliasMap.rightShoulder)
    const lElbow = toLocal(aliasMap.leftLowerArm)
    const rElbow = toLocal(aliasMap.rightLowerArm)
    const lHand = toLocal(aliasMap.leftHand)
    const rHand = toLocal(aliasMap.rightHand)
    const lHip = toLocal(aliasMap.leftUpperLeg)
    const rHip = toLocal(aliasMap.rightUpperLeg)
    const lKnee = toLocal(aliasMap.leftLowerLeg)
    const rKnee = toLocal(aliasMap.rightLowerLeg)
    const lFoot = toLocal(aliasMap.leftFoot)
    const rFoot = toLocal(aliasMap.rightFoot)

    if (!hips || !spine || !chest || !neck || !head) return

    const pelvisCenter = hips.clone().lerp(spine, 0.34).add(new THREE.Vector3(0, -0.02, 0))
    const torsoCenter = spine.clone().lerp(chest, 0.45)
    const chestCenter = chest.clone().lerp(neck, 0.38)
    const headCenter = head.clone().add(new THREE.Vector3(0, 0.12 * headFactor, 0))
    const hairCenter = headCenter.clone().add(new THREE.Vector3(0, 0.02 * headFactor, -0.02))

    setEllipsoid(pelvisRef.current, pelvisCenter, 0.17 * waistFactor * (female ? 1.06 : 1), spine.distanceTo(hips) * 0.54, 0.12 * waistFactor * (female ? 1.08 : 0.98))
    setEllipsoid(torsoRef.current, torsoCenter, 0.145 * waistFactor, chest.distanceTo(spine) * 0.62, 0.105 * waistFactor)
    setEllipsoid(chestRef.current, chestCenter, 0.18 * shoulderFactor * (female ? 0.96 : 1.04), neck.distanceTo(chest) * 0.6, 0.118 * shoulderFactor)
    setSegment(neckRef.current, chestCenter.clone().add(new THREE.Vector3(0, 0.05, 0)), headCenter.clone().add(new THREE.Vector3(0, -0.06, 0)), 0.038, 0.036)
    setEllipsoid(headRef.current, headCenter, 0.102 * headFactor, 0.132 * headFactor, 0.094 * headFactor)
    setEllipsoid(hairRef.current, hairCenter, 0.108 * headFactor, 0.128 * headFactor, 0.102 * headFactor)

    setSegment(leftUpperArmRef.current, lShoulder, lElbow, 0.05, 0.046)
    setSegment(rightUpperArmRef.current, rShoulder, rElbow, 0.05, 0.046)
    setSegment(leftLowerArmRef.current, lElbow, lHand, 0.043, 0.04)
    setSegment(rightLowerArmRef.current, rElbow, rHand, 0.043, 0.04)

    setSegment(leftUpperLegRef.current, lHip, lKnee, 0.065 * (female ? 0.94 : 1), 0.06 * (female ? 0.96 : 1))
    setSegment(rightUpperLegRef.current, rHip, rKnee, 0.065 * (female ? 0.94 : 1), 0.06 * (female ? 0.96 : 1))
    setSegment(leftLowerLegRef.current, lKnee, lFoot, 0.053, 0.05)
    setSegment(rightLowerLegRef.current, rKnee, rFoot, 0.053, 0.05)

    setBox(leftHandRef.current, lHand.clone().add(new THREE.Vector3(0.02, -0.01, 0)), 0.05, 0.025, 0.03)
    setBox(rightHandRef.current, rHand.clone().add(new THREE.Vector3(-0.02, -0.01, 0)), 0.05, 0.025, 0.03)
    setBox(leftFootRef.current, lFoot.clone().add(new THREE.Vector3(0, -0.05, 0.11)), 0.105, 0.06, 0.24)
    setBox(rightFootRef.current, rFoot.clone().add(new THREE.Vector3(0, -0.05, 0.11)), 0.105, 0.06, 0.24)
  })

  return (
    <group renderOrder={1}>
      <mesh ref={pelvisRef} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[1, 24, 20]} />
        <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh ref={torsoRef} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[1, 24, 20]} />
        <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh ref={chestRef} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[1, 24, 20]} />
        <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh ref={neckRef} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh ref={headRef} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[1, 28, 24]} />
        <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh ref={hairRef} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[1, 24, 22]} />
        <meshStandardMaterial color={hairColor} roughness={0.98} metalness={0} />
      </mesh>

      {[leftUpperArmRef, rightUpperArmRef, leftLowerArmRef, rightLowerArmRef, leftUpperLegRef, rightUpperLegRef, leftLowerLegRef, rightLowerLegRef].map((ref, index) => (
        <mesh key={index} ref={ref} castShadow receiveShadow frustumCulled={false}>
          <cylinderGeometry args={[1, 1, 1, 18]} />
          <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
        </mesh>
      ))}

      {[leftHandRef, rightHandRef].map((ref, index) => (
        <mesh key={`hand-${index}`} ref={ref} castShadow receiveShadow frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={skinColor} roughness={0.92} metalness={0} />
        </mesh>
      ))}

      {[leftFootRef, rightFootRef].map((ref, index) => (
        <mesh key={`foot-${index}`} ref={ref} castShadow receiveShadow frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={underColor} roughness={0.95} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

function ModularAvatar({ measurements, selection, gender, poseId }) {
  const mannequinGltf = useGLTF('/assets/models/mannequin.glb')
  const topGltf = useGLTF(selection.top.modelUrl)
  const outerwearGltf = useGLTF(selection.outerwear.modelUrl)
  const bottomGltf = useGLTF(selection.bottom.modelUrl)
  const shoesGltf = useGLTF(selection.shoes.modelUrl)
  const wrapperRef = useRef()

  const bodyScene = useMemo(() => SkeletonUtils.clone(mannequinGltf.scene), [mannequinGltf.scene])
  const fitInfo = useMemo(() => computeBodyFitInfo(SkeletonUtils.clone(mannequinGltf.scene)), [mannequinGltf.scene])
  const baseSkinned = useMemo(() => findSkinnedMeshes(bodyScene)[0], [bodyScene])
  const aliasMap = useMemo(() => aliasMapFromRoot(bodyScene), [bodyScene])
  const initialState = useMemo(() => captureInitialState(aliasMap), [aliasMap])

  const clothingMeshes = useMemo(() => {
    if (!baseSkinned) return []
    return [topGltf.scene, outerwearGltf.scene, bottomGltf.scene, shoesGltf.scene]
      .flatMap((scene) => makeReboundClothingMeshes(SkeletonUtils.clone(scene), baseSkinned))
  }, [topGltf.scene, outerwearGltf.scene, bottomGltf.scene, shoesGltf.scene, baseSkinned])

  useLayoutEffect(() => {
    configureMaterials(bodyScene)
    setBodyOpacity(bodyScene, 0)
    clothingMeshes.forEach((mesh) => {
      configureMaterials(mesh)
      mesh.frustumCulled = false
      mesh.traverse?.((obj) => {
        if (!obj.isMesh && !obj.isSkinnedMesh) return
        obj.frustumCulled = false
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((mat) => {
          if (!mat) return
          mat.polygonOffset = true
          mat.polygonOffsetFactor = -1
          mat.polygonOffsetUnits = -1
          mat.needsUpdate = true
        })
      })
    })
    applySizeControls(aliasMap, initialState, measurements, gender)
    applyPose(aliasMap, initialState, poseId)
    applyFixedBodyFit(wrapperRef, fitInfo, measurements.height / 100)
  }, [bodyScene, clothingMeshes, aliasMap, initialState, measurements, gender, poseId, fitInfo])

  useFrame(() => {
    if (baseSkinned?.skeleton) baseSkinned.skeleton.update()
  })

  return (
    <group ref={wrapperRef}>
      <primitive object={bodyScene} />
      <HumanOverlay aliasMap={aliasMap} wrapperRef={wrapperRef} measurements={measurements} gender={gender} />
      {clothingMeshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </group>
  )
}

function SceneRig({ measurements, selection, gender, poseId }) {
  const controlsRef = useRef()

  return (
    <>
      <CameraRig controlsRef={controlsRef} />
      <OrbitControls ref={controlsRef} enablePan={false} enableDamping dampingFactor={0.08} />
      <ModularAvatar measurements={measurements} selection={selection} gender={gender} poseId={poseId} />
    </>
  )
}

const DEFAULT_THEME = {
  background: '#d8dbdf',
  fog: '#d8dbdf',
  wall: '#ebedf0',
  floor: '#eff1f4',
  floorEdge: '#dce3ee',
  ring: '#e7edf7',
  keyLight: '#ffffff',
  fillLight: '#e0e8f7',
  rimLight: '#dbe3f5',
  glow: '#d9e2f0',
}

export default function MannequinScene({ theme = DEFAULT_THEME, ...props }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.18, 5.45], fov: 22, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog, 5.4, 13.8]} />

      <ambientLight intensity={1.0} />
      <hemisphereLight args={[theme.keyLight, theme.floorEdge, 1.04]} />
      <directionalLight
        position={[3.8, 5.9, 4.4]}
        intensity={1.78}
        color={theme.keyLight}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6.4}
        shadow-camera-bottom={-3.8}
      />
      <spotLight position={[-3.4, 5.0, 3.4]} angle={0.48} penumbra={0.94} intensity={0.86} color={theme.fillLight} />
      <spotLight position={[3.3, 4.7, 2.8]} angle={0.44} penumbra={0.94} intensity={0.92} color={theme.rimLight} />
      <pointLight position={[0, 4.8, -2.6]} intensity={0.24} distance={14} color={theme.glow} />

      <StudioBackdrop theme={theme} />
      <Suspense fallback={null}>
        <SceneRig
          measurements={props.measurements}
          selection={props.selection}
          gender={props.gender}
          poseId={props.poseId}
        />
      </Suspense>
    </Canvas>
  )
}
