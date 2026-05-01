import { create } from "zustand";

export const useAppStore = create((set) => ({
  // ========================================
  // Dimensionality Reduction State
  // ========================================
  reductionMethod: "pca",
  reductionComponents: 3,
  setReductionMethod: (method) => set({ reductionMethod: method }),
  setReductionComponents: (components) =>
    set({ reductionComponents: components }),

  // ========================================
  // View Mode State
  // ========================================
  is2DMode: false,
  setIs2DMode: (is2D) => set({ is2DMode: is2D }),

  // ========================================
  // Collaboration State (synced from Y.js)
  // ========================================
  users: [],
  setUsers: (users) => set({ users }),

  // ========================================
  // Voice/Chat State
  // ========================================
  isConnectedToVoice: false,
  isMuted: true,
  setVoiceStatus: (connected, muted) =>
    set({
      isConnectedToVoice: connected,
      isMuted: muted,
    }),

  // ========================================
  // Annotation State
  // ========================================
  annotationMode: false,
  setAnnotationMode: (mode) => set({ annotationMode: mode }),
}));
