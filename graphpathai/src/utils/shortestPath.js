export function findShortestPath(nodes, edges, startId, endId) {
  console.log("✅ Dijkstra running for:", { startId, endId });

  const graph = new Map();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach(({ from, to }) => {
    graph.get(from)?.push(to);
    graph.get(to)?.push(from);
  });

  const distances = {};
  const prev = {};
  const visited = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    prev[node.id] = null;
  });
  distances[startId] = 0;

  const queue = [...nodes.map((node) => node.id)];

  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const current = queue.shift();
    if (current === endId) break;

    visited.add(current);
    for (const neighbor of graph.get(current)) {
      if (visited.has(neighbor)) continue;
      const alt = distances[current] + 1;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = current;
      }
    }
  }

  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }

  const pathEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    pathEdges.push({ from: path[i], to: path[i + 1] });
  }

  console.log("✅ Shortest path result:", { pathNodes: path, pathEdges });
  return { pathNodes: path, pathEdges };
}