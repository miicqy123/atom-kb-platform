import { create } from "zustand";

type Project = { id: string; name: string; workspaceId: string };

interface ProjectStore {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (p: Project) => void;
  setProjects: (ps: Project[]) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  projects: [],
  setCurrentProject: (p) => set({ currentProject: p }),
  setProjects: (ps) => set({ projects: ps }),
}));