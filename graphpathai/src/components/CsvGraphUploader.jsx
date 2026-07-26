import React, { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import useGraphStore from "../store/graphStore";
import { parseGraphFromCsv } from "../utils/parseGraphFromCsv";

/**
 * CSV drop zone.
 *
 * The previous version ignored PapaParse errors entirely and would happily
 * push an empty graph into the store on a malformed file.
 */
export default function CsvGraphUploader() {
  const setGraph = useGraphStore((s) => s.setGraph);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const fileName = useGraphStore((s) => s.fileName);
  const warnings = useGraphStore((s) => s.warnings);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!/\.csv$/i.test(file.name)) {
        setFileError("That does not look like a .csv file.");
        return;
      }

      setFileError("");
      setParsing(true);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          setParsing(false);
          try {
            const parsed = parseGraphFromCsv(results.data ?? []);
            if (parsed.nodes.length === 0) {
              setFileError('No nodes found. The CSV needs "from" and "to" columns.');
              clearGraph();
              return;
            }
            setGraph(parsed, file.name);
          } catch (err) {
            setFileError(`Could not read that file: ${err.message}`);
            clearGraph();
          }
        },
        error: (err) => {
          setParsing(false);
          setFileError(`Could not read that file: ${err.message}`);
        },
      });
    },
    [setGraph, clearGraph]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section className="panel">
      <div
        className={`dropzone${dragging ? " dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload a graph CSV file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
        <div className="dropzone__icon" aria-hidden="true">
          ⬡
        </div>
        <p className="dropzone__title">
          {parsing ? "Parsing…" : "Drop a graph CSV here, or click to browse"}
        </p>
        <p className="dropzone__hint">
          Columns: <code>from</code>, <code>to</code>, optional <code>weight</code>,{" "}
          <code>note</code>, <code>x</code>/<code>y</code>/<code>z</code>
        </p>
      </div>

      {fileError && <p className="alert alert--error">{fileError}</p>}

      {fileName && !fileError && (
        <div className="filemeta">
          <span className="filemeta__name">{fileName}</span>
          <span className="filemeta__stats">
            {nodes.length.toLocaleString()} nodes · {edges.length.toLocaleString()} edges
          </span>
          <button type="button" className="btn btn--ghost" onClick={clearGraph}>
            Clear
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="alert alert--warn">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
