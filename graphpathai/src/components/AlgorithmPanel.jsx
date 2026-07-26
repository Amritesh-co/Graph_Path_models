import React, { useEffect, useMemo, useState } from "react";
import useGraphStore from "../store/graphStore";
import { findShortestPath, ALGORITHMS } from "../utils/shortestPath";

/**
 * Controls for choosing endpoints and running an algorithm.
 *
 * Errors are surfaced inline instead of through `alert()`, and algorithms that
 * cannot handle the loaded graph (negative weights) are disabled rather than
 * left to fail at run time.
 */
export default function AlgorithmPanel({ isolate, onIsolateChange }) {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const directed = useGraphStore((s) => s.directed);
  const setDirected = useGraphStore((s) => s.setDirected);
  const hasNegativeWeight = useGraphStore((s) => s.hasNegativeWeight);
  const hasCoordinates = useGraphStore((s) => s.hasCoordinates);
  const setResult = useGraphStore((s) => s.setResult);
  const setError = useGraphStore((s) => s.setError);
  const error = useGraphStore((s) => s.error);
  const result = useGraphStore((s) => s.result);

  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [algorithm, setAlgorithm] = useState("Dijkstra");

  // Seed sensible endpoints from the CSV's Start/End notes, falling back to
  // the first and last node, so the app is usable without any fiddling.
  useEffect(() => {
    if (nodes.length === 0) {
      setStartNode("");
      setEndNode("");
      return;
    }
    const noted = (label) =>
      nodes.find((n) => n.note?.trim().toLowerCase() === label)?.id;
    setStartNode(noted("start") ?? nodes[0].id);
    setEndNode(noted("end") ?? nodes[nodes.length - 1].id);
  }, [nodes]);

  // Negative weights rule out the greedy algorithms; switch away automatically.
  useEffect(() => {
    if (hasNegativeWeight && !ALGORITHMS[algorithm].supportsNegative) {
      setAlgorithm("Bellman-Ford");
    }
  }, [hasNegativeWeight, algorithm]);

  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => (
        <option key={node.id} value={node.id}>
          {node.note ? `${node.id} — ${node.note}` : node.id}
        </option>
      )),
    [nodes]
  );

  const run = () => {
    if (!startNode || !endNode) {
      setError("Pick both a start and an end node.");
      return;
    }
    if (startNode === endNode) {
      setError("Start and end are the same node — the path cost is 0.");
      return;
    }

    try {
      const started = performance.now();
      const outcome = findShortestPath(algorithm, nodes, edges, startNode, endNode, {
        directed,
      });
      const elapsed = performance.now() - started;

      if (!outcome.found) {
        setError(
          `No path exists from "${startNode}" to "${endNode}"${
            directed ? " following edge direction" : ""
          }.`
        );
        return;
      }

      setResult({ ...outcome, algorithm, startNode, endNode, elapsed });
    } catch (err) {
      setError(err.message);
    }
  };

  const swap = () => {
    setStartNode(endNode);
    setEndNode(startNode);
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Find a path</h2>
        <p className="panel__sub">{ALGORITHMS[algorithm].blurb}</p>
      </header>

      <div className="controls">
        <label className="field">
          <span className="field__label">Start</span>
          <select value={startNode} onChange={(e) => setStartNode(e.target.value)}>
            {nodeOptions}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--icon"
          onClick={swap}
          title="Swap start and end"
          aria-label="Swap start and end"
        >
          ⇄
        </button>

        <label className="field">
          <span className="field__label">End</span>
          <select value={endNode} onChange={(e) => setEndNode(e.target.value)}>
            {nodeOptions}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Algorithm</span>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
            {Object.entries(ALGORITHMS).map(([name, meta]) => (
              <option
                key={name}
                value={name}
                disabled={hasNegativeWeight && !meta.supportsNegative}
              >
                {name}
                {hasNegativeWeight && !meta.supportsNegative ? " (needs ≥ 0 weights)" : ""}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn btn--primary" onClick={run}>
          Run
        </button>
      </div>

      <div className="toggles">
        <label className="toggle">
          <input
            type="checkbox"
            checked={directed}
            onChange={(e) => setDirected(e.target.checked)}
          />
          <span>Directed edges</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={isolate}
            onChange={(e) => onIsolateChange(e.target.checked)}
          />
          <span>Isolate path</span>
        </label>

        {hasNegativeWeight && <span className="tag tag--warn">negative weights</span>}
        {hasCoordinates && <span className="tag">coordinates · A* informed</span>}
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      {result && (
        <dl className="stats">
          <div>
            <dt>Total cost</dt>
            <dd className="stats__hero">{Number(result.totalCost.toFixed(4))}</dd>
          </div>
          <div>
            <dt>Hops</dt>
            <dd>{result.pathEdges.length}</dd>
          </div>
          <div>
            <dt>Nodes explored</dt>
            <dd>{result.visitedCount ?? "—"}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{result.elapsed.toFixed(1)} ms</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
