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
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  clear: () => void;
}

const initialState = {
  currentProject: null,
  projects: [],
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      clear: () => set(initialState),
    }),
    {
      name: 'atom-kb-project',
      partialize: (state) => ({
        currentProject: state.currentProject,
        projects: state.projects,
      }),
      // 添加状态迁移函数以防万一
      migrate: (persistedState) => {
        if (!persistedState) return initialState;

        // 如果状态结构完全不符合预期，返回初始状态
        if (typeof persistedState !== 'object') {
          return initialState;
        }

        return {
          ...initialState,
          ...persistedState,
          // 确保字段类型正确
          currentProject: (persistedState as any).currentProject || null,
          projects: Array.isArray((persistedState as any).projects) ? (persistedState as any).projects : []
        };
      }
    }
  )
);