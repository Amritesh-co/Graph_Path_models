export function dijkstra(nodes, edges, startId, endId) {
  console.log("✅ Dijkstra running for:", { startId, endId });

  // Step 1: Build weighted adjacency list
  const graph = new Map();
  nodes.forEach((node) => graph.set(node.id, []));
  edges.forEach(({ from, to, weight }) => {
    const w = parseFloat(weight ?? 1);
    graph.get(from)?.push({ node: to, weight: w });
    graph.get(to)?.push({ node: from, weight: w }); // undirected
  });

  // Step 2: Init distances, visited set
  const distances = {};
  const prev = {};
  const visited = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    prev[node.id] = null;
  });
  distances[startId] = 0;

  const queue = [...nodes.map((node) => node.id)];

  // Step 3: Dijkstra loop
  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const current = queue.shift();
    if (current === endId) break;

    visited.add(current);
    for (const neighbor of graph.get(current) || []) {
      if (visited.has(neighbor.node)) continue;
      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        prev[neighbor.node] = current;
      }
    }
  }

  // Step 4: Build path from end to start
  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }

  // Step 5: Convert to edge path
  const pathEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    pathEdges.push({ from: path[i], to: path[i + 1] });
  }

  const totalCost = distances[endId];
  console.log("✅ Shortest path result:", { pathNodes: path, pathEdges, totalCost });

  return { pathNodes: path, pathEdges, totalCost };
}
