import {
  MinHeap,
  buildAdjacency,
  reconstructPath,
  noPath,
  foundPath,
  assertEndpoints,
} from "./graph";

/** Euclidean distance between two nodes that carry x/y/z coordinates. */
function euclidean(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const hasCoords = (n) => Number.isFinite(n?.x) && Number.isFinite(n?.y);

/**
 * Builds an admissible heuristic from node coordinates, when the CSV supplies
 * them (x/y/z columns).
 *
 * Straight-line distance is only a lower bound on path cost if it is expressed
 * in the same units as the weights, so we scale it by the cheapest
 * cost-per-unit-distance found on any edge. Without coordinates the heuristic
 * is 0 and A* degrades to Dijkstra — which is what the previous version did
 * unconditionally, silently.
 */
function makeHeuristic(nodes, edges, endId) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const goal = byId.get(endId);

  if (!hasCoords(goal) || !nodes.every(hasCoords)) {
    return { h: () => 0, informed: false };
  }

  let scale = Infinity;
  for (const edge of edges) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
    const dist = euclidean(a, b);
    if (dist <= 0) continue;
    const w = Number.isFinite(edge.weight) ? edge.weight : 1;
    scale = Math.min(scale, w / dist);
  }
  if (!Number.isFinite(scale) || scale <= 0) return { h: () => 0, informed: false };

  return {
    h: (id) => {
      const node = byId.get(id);
      return node ? scale * euclidean(node, goal) : 0;
    },
    informed: true,
  };
}

/**
 * A* search with a binary heap open set.
 *
 * Previously the open set was a Set scanned linearly with `reduce` on every
 * iteration, and fScore was assigned gScore verbatim (heuristic hard-coded to
 * zero), so it was a slower Dijkstra by construction.
 */
export function aStar(nodes, edges, startId, endId, { directed = false } = {}) {
  assertEndpoints(nodes, startId, endId);

  if (edges.some((e) => Number.isFinite(e.weight) && e.weight < 0)) {
    throw new Error("A* cannot handle negative edge weights. Use Bellman-Ford instead.");
  }

  const graph = buildAdjacency(nodes, edges, directed);
  const { h, informed } = makeHeuristic(nodes, edges, endId);

  const gScore = Object.create(null);
  const cameFrom = Object.create(null);
  nodes.forEach((node) => {
    gScore[node.id] = Infinity;
    cameFrom[node.id] = null;
  });
  gScore[startId] = 0;

  const closed = new Set();
  const open = new MinHeap();
  open.push(startId, h(startId));
  let visitedCount = 0;

  while (open.size > 0) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    visitedCount++;

    if (current === endId) {
      const path = reconstructPath(cameFrom, startId, endId);
      return path
        ? foundPath(path, gScore[endId], { visitedCount, informed })
        : noPath();
    }

    for (const neighbor of graph.get(current) || []) {
      if (closed.has(neighbor.node)) continue;
      const tentative = gScore[current] + neighbor.weight;
      if (tentative < gScore[neighbor.node]) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentative;
        open.push(neighbor.node, tentative + h(neighbor.node));
      }
    }
  }

  return noPath();
}
