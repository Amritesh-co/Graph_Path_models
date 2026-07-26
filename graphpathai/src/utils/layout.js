import * as THREE from "three";

/**
 * Deterministic 3D graph layout.
 *
 * The previous viewers each called `Math.random()` inside a `useMemo`, so the
 * overview and the result view drew completely different pictures of the same
 * graph, and any re-render reshuffled everything. This module produces a
 * stable layout from a seeded PRNG plus a Fruchterman-Reingold style
 * force simulation, so the same graph always looks the same and connected
 * nodes sit near each other.
 */

/** Deterministic 32-bit PRNG (mulberry32). */
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable seed derived from node ids, so the same file lays out identically. */
function seedFrom(nodes) {
  let hash = 2166136261;
  for (const node of nodes) {
    for (let i = 0; i < node.id.length; i++) {
      hash ^= node.id.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

/** Scales supplied x/y/z columns into the view volume, preserving aspect. */
function layoutFromCoordinates(nodes, size) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const zs = nodes.map((n) => n.z ?? 0);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    Math.max(...zs) - Math.min(...zs),
    1e-6
  );
  const scale = size / span;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const cz = (Math.max(...zs) + Math.min(...zs)) / 2;

  const positions = new Map();
  nodes.forEach((n) => {
    positions.set(
      n.id,
      new THREE.Vector3((n.x - cx) * scale, (n.y - cy) * scale, ((n.z ?? 0) - cz) * scale)
    );
  });
  return positions;
}

/**
 * Force-directed layout: repulsion between all nodes, attraction along edges,
 * with a cooling schedule. Iteration count is scaled down for large graphs so
 * the 500-node demo still lays out promptly.
 */
function forceLayout(nodes, edges, size) {
  const random = makeRandom(seedFrom(nodes));
  const n = nodes.length;
  const index = new Map(nodes.map((node, i) => [node.id, i]));

  // Start on a deterministic sphere rather than a uniform cube — spherical
  // starts converge faster and avoid corner clumping.
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const pz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const r = size * 0.5 * Math.cbrt(random());
    px[i] = r * Math.sin(phi) * Math.cos(theta);
    py[i] = r * Math.sin(phi) * Math.sin(theta);
    pz[i] = r * Math.cos(phi);
  }

  if (n > 1) {
    const k = size / Math.cbrt(n); // ideal edge length


    // Sparse, chain-like graphs (few edges per node) need far more iterations
    // to unfold — with too few they stay balled up and nodes visually collide.
    // Dense graphs settle quickly, so they don't pay for the extra passes.
    const density = edges.length / n;
    const chainLike = density < 2;
    const iterations = n > 4000 ? 80 : n > 1500 ? 160 : chainLike ? 600 : 300;
    const fx = new Float32Array(n);
    const fy = new Float32Array(n);
    const fz = new Float32Array(n);

    const edgePairs = edges
      .map((e) => [index.get(e.from), index.get(e.to)])
      .filter(([a, b]) => a !== undefined && b !== undefined);

    // Repulsion falls off as 1/d, so beyond a few ideal-edge-lengths it is
    // negligible. Above this size we bucket nodes into a uniform grid and only
    // compare within neighbouring cells, turning the O(n^2) all-pairs loop into
    // roughly O(n). Without this an 11k-node file froze the tab for ~37s.
    const useGrid = n > 1500;
    const cutoff = k * 2.5;
    const cutoffSq = cutoff * cutoff;

    for (let step = 0; step < iterations; step++) {
      fx.fill(0);
      fy.fill(0);
      fz.fill(0);

      const applyRepulsion = (i, j) => {
        let dx = px[i] - px[j];
        let dy = py[i] - py[j];
        let dz = pz[i] - pz[j];
        let distSq = dx * dx + dy * dy + dz * dz;
        if (useGrid && distSq > cutoffSq) return;
        if (distSq < 1e-4) {
          // Coincident nodes: nudge apart deterministically.
          dx = (random() - 0.5) * 0.1;
          dy = (random() - 0.5) * 0.1;
          dz = (random() - 0.5) * 0.1;
          distSq = dx * dx + dy * dy + dz * dz + 1e-4;
        }
        const dist = Math.sqrt(distSq);
        const force = (k * k) / dist;
        const ux = (dx / dist) * force;
        const uy = (dy / dist) * force;
        const uz = (dz / dist) * force;
        fx[i] += ux; fy[i] += uy; fz[i] += uz;
        fx[j] -= ux; fy[j] -= uy; fz[j] -= uz;
      };

      if (useGrid) {
        // Bucket by cell, then compare each cell against itself and the 13
        // "forward" neighbours so every pair is visited exactly once.
        const cells = new Map();
        const cellKey = (cx, cy, cz) => `${cx},${cy},${cz}`;
        const coords = new Int32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const cx = Math.floor(px[i] / cutoff);
          const cy = Math.floor(py[i] / cutoff);
          const cz = Math.floor(pz[i] / cutoff);
          coords[i * 3] = cx;
          coords[i * 3 + 1] = cy;
          coords[i * 3 + 2] = cz;
          const key = cellKey(cx, cy, cz);
          const bucket = cells.get(key);
          if (bucket) bucket.push(i);
          else cells.set(key, [i]);
        }

        for (const [, bucket] of cells) {
          for (let bi = 0; bi < bucket.length; bi++) {
            const i = bucket[bi];
            for (let bj = bi + 1; bj < bucket.length; bj++) applyRepulsion(i, bucket[bj]);

            const cx = coords[i * 3];
            const cy = coords[i * 3 + 1];
            const cz = coords[i * 3 + 2];
            for (let ox = -1; ox <= 1; ox++) {
              for (let oy = -1; oy <= 1; oy++) {
                for (let oz = -1; oz <= 1; oz++) {
                  // Only half the neighbourhood, so no pair is counted twice.
                  if (ox < 0 || (ox === 0 && (oy < 0 || (oy === 0 && oz <= 0)))) continue;
                  const other = cells.get(cellKey(cx + ox, cy + oy, cz + oz));
                  if (other) for (const j of other) applyRepulsion(i, j);
                }
              }
            }
          }
        }
      } else {
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) applyRepulsion(i, j);
        }
      }

      // Attraction along edges.
      for (const [a, b] of edgePairs) {
        const dx = px[a] - px[b];
        const dy = py[a] - py[b];
        const dz = pz[a] - pz[b];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-3;
        const force = (dist * dist) / k;
        const ux = (dx / dist) * force;
        const uy = (dy / dist) * force;
        const uz = (dz / dist) * force;
        fx[a] -= ux; fy[a] -= uy; fz[a] -= uz;
        fx[b] += ux; fy[b] += uy; fz[b] += uz;
      }

      // Cool down, capping displacement per step.
      const temp = size * 0.1 * (1 - step / iterations);
      for (let i = 0; i < n; i++) {
        const mag = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i] + fz[i] * fz[i]) || 1e-6;
        const limit = Math.min(mag, temp) / mag;
        px[i] += fx[i] * limit;
        py[i] += fy[i] * limit;
        pz[i] += fz[i] * limit;
      }
    }
  }

  const positions = new Map();
  nodes.forEach((node, i) => positions.set(node.id, new THREE.Vector3(px[i], py[i], pz[i])));
  return positions;
}

/** Recentres and rescales a layout to fill the view volume consistently. */
function normalise(positions, size) {
  if (positions.size === 0) return positions;
  const box = new THREE.Box3();
  positions.forEach((p) => box.expandByPoint(p));
  const center = box.getCenter(new THREE.Vector3());
  const extent = box.getSize(new THREE.Vector3());
  const maxExtent = Math.max(extent.x, extent.y, extent.z, 1e-6);
  const scale = size / maxExtent;

  positions.forEach((p) => p.sub(center).multiplyScalar(scale));
  return positions;
}

/**
 * @returns {Map<string, THREE.Vector3>} stable position per node id.
 */
export function computeLayout(nodes, edges, size = 400) {
  if (nodes.length === 0) return new Map();

  const useCoords =
    nodes.length > 0 && nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y));

  const positions = useCoords
    ? layoutFromCoordinates(nodes, size)
    : forceLayout(nodes, edges, size);

  return normalise(positions, size);
}
