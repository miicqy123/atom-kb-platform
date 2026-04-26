import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  workspaceId: string;
}

interface ProjectStore {
  currentProject: Project | null;
  projects: Project[];
  projectId: string | null;
  recentProjectIds: string[];
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setProjectId: (id: string) => void;
  addToRecent: (id: string) => void;
  clear: () => void;
}

const initialState = {
  currentProject: null as Project | null,
  projects: [] as Project[],
  projectId: null as string | null,
  recentProjectIds: [] as string[],
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setCurrentProject: (project) => set({
        currentProject: project,
        projectId: project?.id ?? null
      }),
      setProjects: (projects) => set({ projects }),
      setProjectId: (id) => {
        const project = get().projects.find(p => p.id === id) ?? null;
        set({
          projectId: id,
          currentProject: project ?? (id ? { id, name: '', workspaceId: '' } : null)
        });
        // auto-add to recent
        if (id) {
          const recent = get().recentProjectIds.filter(rid => rid !== id);
          set({ recentProjectIds: [id, ...recent].slice(0, 10) });
        }
      },
      addToRecent: (id) => {
        const recent = get().recentProjectIds.filter(rid => rid !== id);
        set({ recentProjectIds: [id, ...recent].slice(0, 10) });
      },
      clear: () => set({ ...initialState }),
    }),
    {
      name: 'atom-kb-project',
      partialize: (state) => ({
        currentProject: state.currentProject,
        projects: state.projects,
        projectId: state.projectId,
        recentProjectIds: state.recentProjectIds,
      }),
      migrate: (persistedState) => {
        if (!persistedState) return initialState;
        if (typeof persistedState !== 'object') {
          return initialState;
        }
        const ps = persistedState as any;
        return {
          ...initialState,
          ...persistedState,
          currentProject: ps.currentProject || null,
          projects: Array.isArray(ps.projects) ? ps.projects : [],
          projectId: ps.projectId || ps.currentProject?.id || null,
          recentProjectIds: Array.isArray(ps.recentProjectIds) ? ps.recentProjectIds : [],
        };
      }
    }
  )
);