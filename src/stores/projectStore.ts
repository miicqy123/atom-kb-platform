import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  workspaceId: string;
}

interface ProjectStore {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  clear: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      currentProject: null,
      projects: [],
      _hasHydrated: false,
      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      clear: () => set({ currentProject: null, projects: [] }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'atom-kb-project',
      partialize: (state) => ({
        currentProject: state.currentProject,
        projects: state.projects,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);