import { create } from 'zustand';

const useGraphStore = create((set) => ({
  nodes: [],
  edges: [],
  setGraph: ({ nodes, edges }) => set({ nodes, edges }),
}));

export default useGraphStore;
