export function aStar(nodes, edges, startId, endId) {
  const openSet = new Set([startId]);
  const cameFrom = {};

  const gScore = {};
  const fScore = {};

  nodes.forEach(node => {
    gScore[node.id] = Infinity;
    fScore[node.id] = Infinity;
  });

  gScore[startId] = 0;
  fScore[startId] = 0; // No heuristic = behaves like Dijkstra

  const graph = new Map();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach(({ from, to, weight }) => {
    const w = parseFloat(weight ?? 1);
    graph.get(from)?.push({ node: to, weight: w });
    graph.get(to)?.push({ node: from, weight: w }); // undirected
  });

  while (openSet.size > 0) {
    let current = [...openSet].reduce((a, b) =>
      fScore[a] < fScore[b] ? a : b
    );

    if (current === endId) {
      const path = [];
      while (current in cameFrom) {
        path.unshift(current);
        current = cameFrom[current];
      }
      path.unshift(startId);

      return {
        pathNodes: path,
        pathEdges: path.slice(1).map((node, i) => ({
          from: path[i],
          to: node
        })),
        totalCost: gScore[endId]
      };
    }

    openSet.delete(current);

    for (const neighbor of graph.get(current)) {
      const tentative = gScore[current] + neighbor.weight;
      if (tentative < gScore[neighbor.node]) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentative;
        fScore[neighbor.node] = tentative; // heuristic = 0
        openSet.add(neighbor.node);
      }
    }
  }

  return { pathNodes: [], pathEdges: [], totalCost: Infinity };
}
