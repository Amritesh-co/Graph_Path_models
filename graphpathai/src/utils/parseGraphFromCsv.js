export function parseGraphFromCsv(data) {
  const nodesMap = new Map();
  const edges = [];

  data.forEach((row) => {
    const from = row.from?.trim();
    const to = row.to?.trim();
    const note = row.note?.trim() || "";

    if (from && !nodesMap.has(from)) {
      nodesMap.set(from, { id: from, note: "" });
    }

    if (to && !nodesMap.has(to)) {
      nodesMap.set(to, { id: to, note: "" });
    }

    // 🟡 Attach the note to the 'to' node if provided
    if (to && note) {
      nodesMap.set(to, { ...nodesMap.get(to), note });
    }

    if (from && to) {
      edges.push({ from, to });
    }
  });

  const nodes = Array.from(nodesMap.values());
  return { nodes, edges };
}
