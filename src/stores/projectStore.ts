// src/stores/projectStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
  projectId: string;
  projectName: string;
  workspaceId: string;
  setProject: (id: string, name: string, workspaceId: string) => void;
  clear: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projectId: '',
      projectName: '',
      workspaceId: '',
      setProject: (id, name, workspaceId) => set({ projectId: id, projectName: name, workspaceId }),
      clear: () => set({ projectId: '', projectName: '', workspaceId: '' }),
    }),
    { name: 'atom-kb-project' }
  )
);