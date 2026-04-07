import { performance } from 'node:perf_hooks';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resolveTorsoCollider(body) {
  const chestRadius = clamp(body.chestCm / 240, 0.33, 0.62);
  const waistRadius = clamp(body.waistCm / 255, 0.28, 0.55);
  return {
    top: { x: 0, y: 1.14, z: 0.01 },
    bottom: { x: 0, y: -0.72, z: -0.04 },
    radius: Math.max(chestRadius, waistRadius),
  };
}

function closestPointOnSegment(point, a, b) {
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const sz = b.z - a.z;
  const lengthSq = sx * sx + sy * sy + sz * sz;
  if (lengthSq <= 1e-6) return { ...a };
  const pax = point.x - a.x;
  const pay = point.y - a.y;
  const paz = point.z - a.z;
  const t = clamp((pax * sx + pay * sy + paz * sz) / lengthSq, 0, 1);
  return {
    x: a.x + sx * t,
    y: a.y + sy * t,
    z: a.z + sz * t,
  };
}

function buildRestPositions(shellWidth, shellHeight) {
  const gridX = 20;
  const gridY = 28;
  const width = shellWidth * 1.1;
  const height = shellHeight * 1.08;
  const vertexCount = (gridX + 1) * (gridY + 1);
  const arr = new Float32Array(vertexCount * 3);
  let cursor = 0;
  for (let y = 0; y <= gridY; y += 1) {
    const v = y / gridY;
    const py = height * (1 - v) - height / 2;
    for (let x = 0; x <= gridX; x += 1) {
      const u = x / gridX;
      const px = width * u - width / 2;
      arr[cursor] = px;
      arr[cursor + 1] = py;
      arr[cursor + 2] = 0;
      cursor += 3;
    }
  }
  return arr;
}

function runBenchmark({
  frames,
  dt,
  shellWidth,
  shellHeight,
  shellYOffset,
  frontOffset,
  initialBody,
  bodyPerturbationEvery,
}) {
  const restPositions = buildRestPositions(shellWidth, shellHeight);
  const positions = new Float32Array(restPositions);
  const velocities = new Float32Array(restPositions.length);
  const pointCount = positions.length / 3;
  const topRowCount = 21;

  const gravity = -4.2;
  const spring = 13.0;
  const damping = 0.92;
  let body = { ...initialBody };
  let collider = resolveTorsoCollider(body);
  let needsReset = true;
  let lowFpsFrames = 0;
  let failureCount = 0;
  let resetCount = 0;

  const startedAt = performance.now();
  for (let frame = 0; frame < frames; frame += 1) {
    const clampedDt = clamp(dt, 1 / 240, 1 / 20);
    if (!Number.isFinite(dt) || dt > 0.25) {
      failureCount += 1;
      break;
    }

    if (clampedDt > 1 / 28) lowFpsFrames += 1;
    else if (lowFpsFrames > 0) lowFpsFrames -= 1;
    if (lowFpsFrames > 12) {
      failureCount += 1;
      break;
    }

    if (needsReset) {
      positions.set(restPositions);
      velocities.fill(0);
      needsReset = false;
      resetCount += 1;
    }

    if (bodyPerturbationEvery > 0 && frame > 0 && frame % bodyPerturbationEvery === 0) {
      body = {
        ...body,
        chestCm: body.chestCm + (frame / bodyPerturbationEvery) % 2 === 0 ? 1.2 : -1.2,
        waistCm: body.waistCm + (frame / bodyPerturbationEvery) % 2 === 0 ? 0.9 : -0.9,
      };
      collider = resolveTorsoCollider(body);
      needsReset = true;
    }

    for (let index = 0; index < pointCount; index += 1) {
      const i3 = index * 3;
      if (index < topRowCount) {
        positions[i3] = restPositions[i3];
        positions[i3 + 1] = restPositions[i3 + 1];
        positions[i3 + 2] = restPositions[i3 + 2];
        velocities[i3] = 0;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = 0;
        continue;
      }

      const dx = restPositions[i3] - positions[i3];
      const dy = restPositions[i3 + 1] - positions[i3 + 1];
      const dz = restPositions[i3 + 2] - positions[i3 + 2];

      velocities[i3] = (velocities[i3] + dx * spring * clampedDt) * damping;
      velocities[i3 + 1] = (velocities[i3 + 1] + (dy * spring + gravity) * clampedDt) * damping;
      velocities[i3 + 2] = (velocities[i3 + 2] + dz * spring * clampedDt) * damping;

      positions[i3] += velocities[i3] * clampedDt;
      positions[i3 + 1] += velocities[i3 + 1] * clampedDt;
      positions[i3 + 2] += velocities[i3 + 2] * clampedDt;

      const point = {
        x: positions[i3],
        y: positions[i3 + 1] + shellYOffset,
        z: positions[i3 + 2] + frontOffset,
      };
      const closest = closestPointOnSegment(point, collider.top, collider.bottom);
      let nx = point.x - closest.x;
      let ny = point.y - closest.y;
      let nz = point.z - closest.z;
      const distance = Math.hypot(nx, ny, nz);

      if (distance < collider.radius) {
        const safeDistance = Math.max(distance, 1e-4);
        nx /= safeDistance;
        ny /= safeDistance;
        nz /= safeDistance;
        const push = collider.radius - safeDistance;
        positions[i3] += nx * push;
        positions[i3 + 1] += ny * push;
        positions[i3 + 2] += nz * push;

        const velocityDot = velocities[i3] * nx + velocities[i3 + 1] * ny + velocities[i3 + 2] * nz;
        if (velocityDot < 0) {
          velocities[i3] -= nx * velocityDot * 0.75;
          velocities[i3 + 1] -= ny * velocityDot * 0.75;
          velocities[i3 + 2] -= nz * velocityDot * 0.75;
        }
      }
    }
  }
  const elapsedMs = performance.now() - startedAt;
  const fpsEquivalent = frames / (elapsedMs / 1000);

  return { elapsedMs, fpsEquivalent, failureCount, resetCount };
}

function runFailureGuardChecks() {
  const lowFpsTrip = runBenchmark({
    frames: 120,
    dt: 1 / 24,
    shellWidth: 2.0,
    shellHeight: 2.7,
    shellYOffset: 0.4,
    frontOffset: 0.16,
    initialBody: { chestCm: 98, waistCm: 80 },
    bodyPerturbationEvery: 0,
  }).failureCount > 0;

  const invalidDeltaTrip = runBenchmark({
    frames: 1,
    dt: 0.3,
    shellWidth: 2.0,
    shellHeight: 2.7,
    shellYOffset: 0.4,
    frontOffset: 0.16,
    initialBody: { chestCm: 98, waistCm: 80 },
    bodyPerturbationEvery: 0,
  }).failureCount > 0;

  return { lowFpsTrip, invalidDeltaTrip };
}

function main() {
  const benchmark = runBenchmark({
    frames: 1800,
    dt: 1 / 60,
    shellWidth: 2.05,
    shellHeight: 2.8,
    shellYOffset: 0.45,
    frontOffset: 0.16,
    initialBody: { chestCm: 98, waistCm: 80 },
    bodyPerturbationEvery: 40,
  });
  const guard = runFailureGuardChecks();

  console.log(JSON.stringify({
    scenario: 'cloth-4a-preview-benchmark',
    fpsEquivalent: Number(benchmark.fpsEquivalent.toFixed(2)),
    elapsedMs: Number(benchmark.elapsedMs.toFixed(2)),
    resetCount: benchmark.resetCount,
    failureCount: benchmark.failureCount,
    guard,
    pass: benchmark.fpsEquivalent >= 30 && benchmark.failureCount === 0 && guard.lowFpsTrip && guard.invalidDeltaTrip,
  }, null, 2));
}

main();
