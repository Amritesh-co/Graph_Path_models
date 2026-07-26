/**
 * Shared graph primitives. Every algorithm builds its adjacency the same way
 * here, so Dijkstra, A* and Bellman-Ford can no longer disagree about whether
 * an edge is directed.
 */

/** Binary min-heap keyed by a numeric priority. */
export class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(value, priority) {
    this.items.push({ value, priority });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}

/**
 * Adjacency list keyed by node id. When `directed` is false each edge is
 * inserted in both directions.
 */
export function buildAdjacency(nodes, edges, directed) {
  const graph = new Map();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach(({ from, to, weight }) => {
    const w = Number.isFinite(weight) ? weight : 1;
    graph.get(from)?.push({ node: to, weight: w });
    if (!directed) graph.get(to)?.push({ node: from, weight: w });
  });
  return graph;
}

/** Edge list expanded to both directions for undirected Bellman-Ford. */
export function expandEdges(edges, directed) {
  const w = (e) => (Number.isFinite(e.weight) ? e.weight : 1);
  if (directed) return edges.map((e) => ({ from: e.from, to: e.to, weight: w(e) }));
  return edges.flatMap((e) => [
    { from: e.from, to: e.to, weight: w(e) },
    { from: e.to, to: e.from, weight: w(e) },
  ]);
}

/**
 * Walk predecessors from `endId` back to `startId`.
 *
 * Returns null when the target was never reached, rather than the truncated
 * partial path the previous `while (current)` loops produced. The visited set
 * guards against a predecessor cycle so a malformed result cannot hang the tab.
 */
export function reconstructPath(prev, startId, endId) {
  const path = [];
  const seen = new Set();
  let current = endId;

  while (current != null) {
    if (seen.has(current)) return null;
    seen.add(current);
    path.unshift(current);
    if (current === startId) return path;
    current = prev[current] ?? null;
  }
  return null;
}

/** Consecutive node ids -> edge pairs. */
export function pathToEdges(path) {
  const out = [];
  for (let i = 0; i < path.length - 1; i++) {
    out.push({ from: path[i], to: path[i + 1] });
  }
  return out;
}

/** Uniform "no route exists" result. */
export function noPath() {
  return { pathNodes: [], pathEdges: [], totalCost: Infinity, found: false };
}

/** Uniform success result. */
export function foundPath(path, totalCost, meta = {}) {
  return {
    pathNodes: path,
    pathEdges: pathToEdges(path),
    totalCost,
    found: true,
    ...meta,
  };
}

/** Throws if the endpoints are missing, so the UI can report it cleanly. */
export function assertEndpoints(nodes, startId, endId) {
  const ids = new Set(nodes.map((n) => n.id));
  if (!ids.has(startId)) throw new Error(`Start node "${startId}" is not in the graph.`);
  if (!ids.has(endId)) throw new Error(`End node "${endId}" is not in the graph.`);
}
