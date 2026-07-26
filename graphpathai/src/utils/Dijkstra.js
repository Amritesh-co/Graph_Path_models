import {
  MinHeap,
  buildAdjacency,
  reconstructPath,
  noPath,
  foundPath,
  assertEndpoints,
} from "./graph";

/**
 * Dijkstra's shortest path with a binary heap.
 *
 * Was O(V^2 log V) — it re-sorted the entire frontier on every iteration.
 * Now O((V + E) log V) using lazy deletion: a node may be pushed more than
 * once, and stale entries are skipped when popped.
 */
export function dijkstra(nodes, edges, startId, endId, { directed = false } = {}) {
  assertEndpoints(nodes, startId, endId);

  if (edges.some((e) => Number.isFinite(e.weight) && e.weight < 0)) {
    throw new Error("Dijkstra cannot handle negative edge weights. Use Bellman-Ford instead.");
  }

  const graph = buildAdjacency(nodes, edges, directed);
  const distances = Object.create(null);
  const prev = Object.create(null);
  const visited = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    prev[node.id] = null;
  });
  distances[startId] = 0;

  const heap = new MinHeap();
  heap.push(startId, 0);
  let visitedCount = 0;

  while (heap.size > 0) {
    const current = heap.pop();
    if (visited.has(current)) continue; // stale heap entry
    visited.add(current);
    visitedCount++;

    if (current === endId) break;

    for (const neighbor of graph.get(current) || []) {
      if (visited.has(neighbor.node)) continue;
      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        prev[neighbor.node] = current;
        heap.push(neighbor.node, alt);
      }
    }
  }

  const path = reconstructPath(prev, startId, endId);
  if (!path) return noPath();

  return foundPath(path, distances[endId], { visitedCount });
}
