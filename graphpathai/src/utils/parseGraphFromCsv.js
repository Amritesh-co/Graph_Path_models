export function parseGraphFromCsv(data) {
  const nodesMap = new Map();
  const edges = [];
  let hasNegativeWeight = false;

  data.forEach((row) => {
    const from = row.from?.trim();
    const to = row.to?.trim();
    const note = row.note?.trim() || "";
    const weightStr = row.weight?.trim();
    const weight = weightStr ? parseFloat(weightStr) : 1;

    if (weight < 0) hasNegativeWeight = true;

    if (from && !nodesMap.has(from)) {
      nodesMap.set(from, { id: from, note: "" });
    }

    if (to && !nodesMap.has(to)) {
      nodesMap.set(to, { id: to, note: "" });
    }

    if (to && note) {
      nodesMap.set(to, { ...nodesMap.get(to), note });
    }

    if (from && to) {
      edges.push({ from, to, weight });
    }
  });

  const nodes = Array.from(nodesMap.values());
  return { nodes, edges, hasNegativeWeight };
}
