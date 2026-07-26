# GraphPath

Load a graph from CSV, explore it in 3D, and run shortest-path algorithms over it.

## Running

```bash
npm install
npm run dev      # http://localhost:5173/GraphPathAI/
npm run build
npm run deploy   # publishes dist/ to GitHub Pages
```

## CSV format

Columns are matched case-insensitively and may appear in any order.

| Column           | Required | Meaning                                                     |
| ---------------- | -------- | ----------------------------------------------------------- |
| `from`, `to`     | yes      | Edge endpoints. Nodes are created implicitly.                |
| `weight`         | no       | Edge cost, defaults to `1`.                                  |
| `note`           | no       | Label on the `to` node. `Start`/`End` preselect the endpoints.|
| `x`, `y`, `z`    | no       | Node coordinates — used for layout and the A\* heuristic.    |

```csv
from,to,weight,note
A,B,4,Start
B,C,1,
C,D,3,End
```

Malformed rows do not abort the load: bad weights fall back to `1`, self-loops
and rows missing an endpoint are dropped, duplicate edges are merged keeping the
lowest weight, and everything skipped is reported in the UI.

## Algorithms

| Algorithm    | Negative weights | Notes                                                    |
| ------------ | ---------------- | -------------------------------------------------------- |
| Dijkstra     | no               | Binary heap, O((V + E) log V).                            |
| Bellman-Ford | yes              | Detects negative cycles; early exit once converged.       |
| A\*          | no               | Coordinate heuristic when the CSV has `x`/`y`; else = Dijkstra. |

All three share one adjacency builder, so they agree on the same input. The
**Directed edges** toggle applies to all of them uniformly.

A note on A\*: straight-line distance is only an admissible heuristic if it is
in the same units as the weights, so it is scaled by the cheapest observed
cost-per-unit-distance. Without coordinates the heuristic is 0 and A\* is
exactly Dijkstra — the UI says so rather than pretending otherwise.

## Layout

`src/utils/layout.js` produces a deterministic layout: a seeded PRNG plus a
Fruchterman-Reingold force simulation, so the same file always looks the same.
If the CSV supplies coordinates those are used directly instead. Above ~1500
nodes, repulsion is restricted to neighbouring cells of a uniform spatial grid,
which keeps an 11k-node graph at roughly two seconds instead of ~37.

## Project structure

```
src/
  App.jsx                        shell, owns the shared layout
  components/
    CsvGraphUploader.jsx         drag-and-drop CSV intake
    AlgorithmPanel.jsx           endpoint/algorithm controls and result stats
    GraphViewer3D.jsx            the one 3D viewer, overview and result
  store/graphStore.js            zustand state
  utils/
    graph.js                     adjacency, min-heap, path reconstruction
    Dijkstra.js BellmanFord.js AStar.js
    shortestPath.js              algorithm registry
    layout.js                    deterministic 3D layout
    parseGraphFromCsv.js         tolerant CSV -> graph
```
