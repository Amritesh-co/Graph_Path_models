import React, { useState } from "react";
import useGraphStore from "../store/graphStore";
import { findShortestPath } from "../utils/shortestPath";

function AlgorithmPanel({ onDijkstraResult }) {
  const { nodes, edges } = useGraphStore();
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [isolate, setIsolate] = useState(false);

  const handleRunDijkstra = () => {
    if (!startNode || !endNode) return alert("Select both start and end nodes");
    const { pathNodes, pathEdges } = findShortestPath(nodes, edges, startNode, endNode);
    onDijkstraResult({ pathNodes, pathEdges, isolate });
  };

  return (
    <div style={{ margin: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <h3>Dijkstra's Algorithm</h3>

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
        <label>Isolate Path Only: </label>
        <input
          type="checkbox"
          checked={isolate}
          onChange={(e) => setIsolate(e.target.checked)}
        />
      </div>

      <button onClick={handleRunDijkstra}>Run Dijkstra</button>
    </div>
  );
}

export default AlgorithmPanel;
