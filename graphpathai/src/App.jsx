import React, { useState } from "react";
import CsvGraphUploader from "./components/CsvGraphUploader";
import GraphViewer3D from "./components/GraphViewer3D";
import AlgorithmPanel from "./components/AlgorithmPanel";
import PathGraphViewer3D from "./components/PathGraphViewer3D";
import useGraphStore from "./store/graphStore";

function App() {
  const { nodes, edges } = useGraphStore();
  const [algorithmResult, setAlgorithmResult] = useState(null);

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>GraphPathAI</h1>
      <CsvGraphUploader />
      <GraphViewer3D />

      {nodes.length > 0 && edges.length > 0 && (
        <>
          <AlgorithmPanel onResult={setAlgorithmResult} />

          {algorithmResult && (
            <>
              <h2 style={{ textAlign: "center" }}>{algorithmResult.algorithm} Result View</h2>
              <PathGraphViewer3D
                nodes={nodes}
                edges={edges}
                highlightNodes={algorithmResult.pathNodes}
                highlightEdges={algorithmResult.pathEdges}
                isolate={algorithmResult.isolate}
              />
              <p style={{ textAlign: "center", color: "green" }}>
                Total Path Cost: {algorithmResult.totalCost}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
