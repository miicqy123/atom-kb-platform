// src/components/ui/ProjectSwitcher.tsx
'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { trpc } from '@/lib/trpc';
import { useSession } from 'next-auth/react';

interface ProjectSwitcherProps {
  onProjectChange?: (projectId: string) => void;
}

export function ProjectSwitcher({ onProjectChange }: ProjectSwitcherProps) {
  const { data: session } = useSession();
  const { currentProjectId, setCurrentProjectId, addToRecent } = useProjectStore();

  const { data: projects } = trpc.project.list.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    // Set default project if none is selected and projects are available
    if (!currentProjectId && projects?.length > 0) {
      const firstProject = projects[0];
      setCurrentProjectId(firstProject.id);
      addToRecent(firstProject.id);
    }
  }, [projects, currentProjectId, setCurrentProjectId, addToRecent]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    setCurrentProjectId(projectId);
    addToRecent(projectId);
    if (onProjectChange) {
      onProjectChange(projectId);
    }
  };

  if (!projects?.length) {
    return <div className="text-sm text-gray-500 px-3 py-2">无项目</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="project-select" className="text-sm text-gray-600">项目:</label>
      <select
        id="project-select"
        value={currentProjectId || ''}
        onChange={handleProjectChange}
        className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}