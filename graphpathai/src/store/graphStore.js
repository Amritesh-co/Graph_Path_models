import { create } from "zustand";

const emptyGraph = {
  nodes: [],
  edges: [],
  hasNegativeWeight: false,
  hasCoordinates: false,
  warnings: [],
  fileName: "",
};

const useGraphStore = create((set) => ({
  ...emptyGraph,
  directed: false,
  result: null,
  error: "",

  setGraph: (graph, fileName = "") =>
    set({ ...emptyGraph, ...graph, fileName, result: null, error: "" }),

  setDirected: (directed) => set({ directed, result: null }),
  setResult: (result) => set({ result, error: "" }),
  setError: (error) => set({ error, result: null }),
  clearGraph: () => set({ ...emptyGraph, result: null, error: "" }),
}));

export default useGraphStore;
