import { dijkstra } from "./Dijkstra";
import { bellmanFord } from "./BellmanFord";
import { aStar } from "./AStar";

export const ALGORITHMS = {
  Dijkstra: {
    run: dijkstra,
    supportsNegative: false,
    blurb: "Heap-based. Fastest of the three, but requires non-negative weights.",
  },
  "Bellman-Ford": {
    run: bellmanFord,
    supportsNegative: true,
    blurb: "Handles negative weights and detects negative cycles.",
  },
  "A*": {
    run: aStar,
    supportsNegative: false,
    blurb: "Uses x/y/z columns as a distance heuristic when the CSV provides them.",
  },
};

export function findShortestPath(algorithm, nodes, edges, startId, endId, options = {}) {
  const entry = ALGORITHMS[algorithm];
  if (!entry) throw new Error(`Unsupported algorithm: ${algorithm}`);
  return entry.run(nodes, edges, startId, endId, options);
}
