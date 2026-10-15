# GraphPathAI — 3D Shortest-Path Visualizer

Upload a graph as a CSV and explore it in 3D. GraphPathAI renders the network with React Three Fiber and animates shortest paths computed by Dijkstra, A* and Bellman-Ford, so you can compare how each algorithm behaves on the same graph.

**Live demo:** https://graph-path-models.vercel.app

## Features

- **CSV import** — drop in an edge list and the graph is parsed with PapaParse and laid out in 3D
- **Three algorithms** — Dijkstra, A* and Bellman-Ford (handles negative weights)
- **Interactive 3D viewer** — orbit, zoom and select source/target nodes
- **Dark mode** and an error boundary that keeps the viewer stable on bad input
- **Sample data** — `demo_input/` includes generated graphs up to 500 nodes

## Tech stack

React 19 · Vite · Three.js / React Three Fiber / Drei · Zustand · PapaParse

## Run locally

```bash
git clone https://github.com/Amritesh-co/Graph_Path_models.git
cd Graph_Path_models/graphpathai
npm install
npm run dev
```

## CSV format

One edge per row:

```csv
source,target,weight
A,B,4
B,C,2
```

Use `cs_generator/csv_gen.py` to generate random test graphs.

## Repository layout

```
graphpathai/        # the React + Vite app
  src/utils/        # Dijkstra.js, AStar.js, BellmanFord.js, graph parsing, layout
  src/components/   # GraphViewer3D, AlgorithmPanel, CsvGraphUploader
cs_generator/       # random graph CSV generator
demo_input/         # sample graphs
```
