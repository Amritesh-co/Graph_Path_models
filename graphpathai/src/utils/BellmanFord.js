import { expandEdges, reconstructPath, noPath, foundPath, assertEndpoints } from "./graph";

/**
 * Bellman-Ford shortest path, with negative-weight-cycle detection.
 *
 * Fixes vs. the previous version:
 *  - honours the `directed` flag instead of always treating edges as directed,
 *    which made it disagree with Dijkstra/A* on the very same CSV;
 *  - skips relaxation from unreached nodes rather than doing Infinity
 *    arithmetic;
 *  - stops early once a full pass changes nothing;
 *  - returns "no path" instead of a truncated partial path when the target is
 *    unreachable.
 */
export function bellmanFord(nodes, edges, startId, endId, { directed = false } = {}) {
  assertEndpoints(nodes, startId, endId);

  const relaxable = expandEdges(edges, directed);

  if (!directed && relaxable.some((e) => e.weight < 0)) {
    throw new Error(
      "An undirected edge with a negative weight is always a negative cycle (you can walk it back and forth forever). Switch to directed mode to use negative weights."
    );
  }

  const distances = Object.create(null);
  const predecessors = Object.create(null);
  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    predecessors[node.id] = null;
  });
  distances[startId] = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    let changed = false;
    for (const { from, to, weight } of relaxable) {
      if (distances[from] === Infinity) continue;
      const alt = distances[from] + weight;
      if (alt < distances[to]) {
        distances[to] = alt;
        predecessors[to] = from;
        changed = true;
      }
    }
    if (!changed) break; // already converged
  }

  for (const { from, to, weight } of relaxable) {
    if (distances[from] === Infinity) continue;
    if (distances[from] + weight < distances[to]) {
      throw new Error("Graph contains a negative-weight cycle, so no shortest path exists.");
    }
  }

  const path = reconstructPath(predecessors, startId, endId);
  if (!path) return noPath();

  return foundPath(path, distances[endId]);
}
