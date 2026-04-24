// src/stores/projectStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
  projectId: string;
  projectName: string;
  workspaceId: string;
  currentProjectId: string | null;
  recentProjects: string[];
  setProject: (id: string, name: string, workspaceId: string) => void;
  setCurrentProjectId: (id: string | null) => void;
  addToRecent: (id: string) => void;
  clear: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projectId: '',
      projectName: '',
      workspaceId: '',
      currentProjectId: null,
      recentProjects: [],
      setProject: (id, name, workspaceId) => set({ projectId: id, projectName: name, workspaceId }),
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      addToRecent: (id) => {
        set(state => {
          const filtered = state.recentProjects.filter(pid => pid !== id);
          const updated = [id, ...filtered].slice(0, 5); // Keep only last 5
          return { recentProjects: updated };
        });
      },
      clear: () => set({ projectId: '', projectName: '', workspaceId: '', currentProjectId: null }),
    }),
    { name: 'atom-kb-project' }
  )
);