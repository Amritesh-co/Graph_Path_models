import React, { useEffect, useState } from "react";
import CsvGraphUploader from "./components/CsvGraphUploader";
import GraphViewer3D from "./components/GraphViewer3D";
import ViewerErrorBoundary from "./components/ViewerErrorBoundary";
import AlgorithmPanel from "./components/AlgorithmPanel";
import useGraphStore from "./store/graphStore";
import useDarkMode from "./utils/useDarkMode";
import { computeLayout } from "./utils/layout";
import "./App.css";

export default function App() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const result = useGraphStore((s) => s.result);
  const isDark = useDarkMode();
  const [isolate, setIsolate] = useState(false);

  // One layout, shared by every view, computed only when the graph changes.
  // Large graphs take a moment, so it runs after a paint rather than inline in
  // render — otherwise the tab looks frozen while the force simulation runs.
  const [positions, setPositions] = useState(() => new Map());
  const [layingOut, setLayingOut] = useState(false);

  useEffect(() => {
    if (nodes.length === 0) {
      setPositions(new Map());
      setLayingOut(false);
      return;
    }

    let cancelled = false;
    setLayingOut(true);

    const id = requestAnimationFrame(() => {
      const next = computeLayout(nodes, edges, 400);
      if (!cancelled) {
        setPositions(next);
        setLayingOut(false);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [nodes, edges]);

  const hasGraph = nodes.length > 0 && edges.length > 0;

  return (
    <div className={`app${isDark ? " app--dark" : ""}`}>
      <header className="masthead">
        <h1>
          Graph<span>Path</span>
        </h1>
        <p>Shortest-path algorithms, visualised in 3D.</p>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <CsvGraphUploader />
          {hasGraph && <AlgorithmPanel isolate={isolate} onIsolateChange={setIsolate} />}
        </aside>

        <div className="stage">
          {layingOut && (
            <div className="stage__overlay">
              <span className="spinner" aria-hidden="true" />
              Laying out {nodes.length.toLocaleString()} nodes…
            </div>
          )}
          <ViewerErrorBoundary resetKey={`${nodes.length}-${edges.length}`} height="100%">
            <GraphViewer3D
              nodes={layingOut ? [] : nodes}
              edges={edges}
              positions={positions}
              highlightNodes={result?.pathNodes ?? []}
              highlightEdges={result?.pathEdges ?? []}
              isolate={isolate}
              isDark={isDark}
              height="100%"
              emptyMessage={layingOut ? "" : "Upload a CSV to visualise the graph"}
            />
          </ViewerErrorBoundary>

          {result && (
            <div className="pathstrip">
              <span className="pathstrip__label">
                {result.algorithm} · cost {Number(result.totalCost.toFixed(4))}
              </span>
              <ol className="pathstrip__nodes">
                {result.pathNodes.map((id, i) => (
                  <li key={`${id}-${i}`} data-id={id} />
                ))}
              </ol>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
