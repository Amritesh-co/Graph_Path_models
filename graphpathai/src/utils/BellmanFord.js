export function bellmanFord(nodes, edges, startId, endId) {
  const distances = {};
  const predecessors = {};

  nodes.forEach(node => {
    distances[node.id] = Infinity;
    predecessors[node.id] = null;
  });

  distances[startId] = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    edges.forEach(({ from, to, weight }) => {
      const w = parseFloat(weight ?? 1);
      if (distances[from] + w < distances[to]) {
        distances[to] = distances[from] + w;
        predecessors[to] = from;
      }
    });
  }

  // Detect negative-weight cycle
  for (const { from, to, weight } of edges) {
    if (distances[from] + parseFloat(weight ?? 1) < distances[to]) {
      throw new Error("⚠️ Graph contains a negative-weight cycle.");
    }
  }

  const path = [];
  let current = endId;
  while (current !== null) {
    path.unshift(current);
    current = predecessors[current];
  }

  return {
    pathNodes: path,
    pathEdges: path.slice(1).map((node, i) => ({
      from: path[i],
      to: node
    })),
    totalCost: distances[endId]
  };
}
