import React, { useState } from "react";
import CsvGraphUploader from "./components/CsvGraphUploader";
import GraphViewer3D from "./components/GraphViewer3D";

import AlgorithmPanel from "./components/AlgorithmPanel";
import PathGraphViewer3D from "./components/PathGraphViewer3D";
import useGraphStore from "./store/graphStore";
function App() {
  const { nodes, edges } = useGraphStore();
  const [dijkstraResult, setDijkstraResult] = useState(null);
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>GraphPathAI</h1>
      <CsvGraphUploader />
      <GraphViewer3D />
      {nodes.length > 0 && edges.length > 0 && (
        <>
          <AlgorithmPanel onDijkstraResult={setDijkstraResult} />
          {dijkstraResult && (
            <>
              <h2 style={{ textAlign: "center" }}>Dijkstra Result View</h2>
              <PathGraphViewer3D
                nodes={nodes}
                edges={edges}
                highlightNodes={dijkstraResult.pathNodes}
                highlightEdges={dijkstraResult.pathEdges}
                isolate={dijkstraResult.isolate}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
export default App;