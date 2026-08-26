import { ApiClient } from './api';
import type { Project, ProjectSummary } from '../types';

export const projectApi = {
  getProjects: async (workspaceId: string): Promise<Project[]> => {
    return ApiClient.get<Project[]>(`/workspaces/${workspaceId}/projects`);
  },

  getProject: async (projectId: string): Promise<Project> => {
    return ApiClient.get<Project>(`/projects/${projectId}`);
  },

  createProject: async (
    workspaceId: string,
    data: { name: string; key: string; description?: string }
  ): Promise<Project> => {
    return ApiClient.post<Project>(`/workspaces/${workspaceId}/projects`, data);
  },

  updateProject: async (
    projectId: string,
    data: { name?: string; description?: string; status?: 'ACTIVE' | 'ARCHIVED' }
  ): Promise<Project> => {
    return ApiClient.put<Project>(`/projects/${projectId}`, data);
  },

  getProjectSummary: async (projectId: string): Promise<ProjectSummary> => {
    return ApiClient.get<ProjectSummary>(`/projects/${projectId}/summary`);
  },
};
