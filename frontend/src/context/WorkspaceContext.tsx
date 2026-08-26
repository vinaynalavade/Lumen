import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Workspace, Project } from '../types';
import { workspaceApi } from '../services/workspaceApi';
import { projectApi } from '../services/projectApi';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveProject: (project: Project | null) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchWorkspaces = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const wsList = await workspaceApi.getWorkspaces();
      setWorkspaces(wsList);

      const savedWsId = localStorage.getItem('lumen_active_workspace_id');
      let currentWs = wsList.find((w) => w.id === savedWsId);
      if (!currentWs && wsList.length > 0) {
        currentWs = wsList[0];
      }

      if (currentWs) {
        setActiveWorkspaceState(currentWs);
        localStorage.setItem('lumen_active_workspace_id', currentWs.id);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!activeWorkspace) {
      setProjects([]);
      setActiveProjectState(null);
      return;
    }

    try {
      const projList = await projectApi.getProjects(activeWorkspace.id);
      setProjects(projList);

      const savedProjId = localStorage.getItem('lumen_active_project_id');
      let currentProj = projList.find((p) => p.id === savedProjId);
      if (!currentProj && projList.length > 0) {
        currentProj = projList[0];
      }

      if (currentProj) {
        setActiveProjectState(currentProj);
        localStorage.setItem('lumen_active_project_id', currentProj.id);
      } else {
        setActiveProjectState(null);
        localStorage.removeItem('lumen_active_project_id');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setProjects([]);
      setActiveProjectState(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects();
    }
  }, [activeWorkspace?.id]);

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('lumen_active_workspace_id', workspace.id);
  };

  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem('lumen_active_project_id', project.id);
    } else {
      localStorage.removeItem('lumen_active_project_id');
    }
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  const refreshProjects = async () => {
    await fetchProjects();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        projects,
        activeProject,
        isLoading,
        setActiveWorkspace,
        setActiveProject,
        refreshWorkspaces,
        refreshProjects,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
