import { dijkstra } from "./Dijkstra";
import { bellmanFord } from "./BellmanFord";
import { aStar } from "./AStar";

export function findShortestPath(algorithm, nodes, edges, startId, endId) {
  switch (algorithm) {
    case "Dijkstra":
      return dijkstra(nodes, edges, startId, endId);
    case "Bellman-Ford":
      return bellmanFord(nodes, edges, startId, endId);
    case "A*":
      return aStar(nodes, edges, startId, endId);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}
