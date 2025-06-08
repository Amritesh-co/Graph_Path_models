import React, { useState } from "react";
import useGraphStore from "../store/graphStore";
import { findShortestPath } from "../utils/shortestPath";

function AlgorithmPanel({ onResult }) {
  const { nodes, edges } = useGraphStore();
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [algorithm, setAlgorithm] = useState("Dijkstra");
  const [isolate, setIsolate] = useState(false);

  const handleRunAlgorithm = () => {
  if (!startNode || !endNode)
    return alert("Select both start and end nodes");

  try {
    console.log("✅ DEBUG - Algorithm:", algorithm);
    console.log("✅ DEBUG - Start Node:", startNode);
    console.log("✅ DEBUG - End Node:", endNode);
    console.log("✅ DEBUG - Nodes:", nodes);
    console.log("✅ DEBUG - Edges:", edges);

    const result = findShortestPath(
      algorithm,
      nodes,
      edges,
      startNode,
      endNode
    );

    onResult({
      ...result,
      isolate,
      algorithm
    });
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
};


  return (
    <div style={{ margin: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <h3>Shortest Path Algorithm</h3>

      <div>
        <label>Start Node: </label>
        <select value={startNode} onChange={(e) => setStartNode(e.target.value)}>
          <option value="">-- Select --</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>{node.id}</option>
          ))}
        </select>
      </div>

      <div>
        <label>End Node: </label>
        <select value={endNode} onChange={(e) => setEndNode(e.target.value)}>
          <option value="">-- Select --</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>{node.id}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Algorithm: </label>
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option value="Dijkstra">Dijkstra</option>
          <option value="Bellman-Ford">Bellman-Ford</option>
          <option value="A*">A*</option>
        </select>
      </div>

      <div>
        <label>Isolate Path Only: </label>
        <input
          type="checkbox"
          checked={isolate}
          onChange={(e) => setIsolate(e.target.checked)}
        />
      </div>

      <button onClick={handleRunAlgorithm}>Run Algorithm</button>
    </div>
  );
}

export default AlgorithmPanel;
