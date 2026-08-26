import { ApiClient } from './api';
import type { Workspace, WorkspaceMember } from '../types';

export const workspaceApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    return ApiClient.get<Workspace[]>('/workspaces');
  },

  getWorkspace: async (id: string): Promise<Workspace> => {
    return ApiClient.get<Workspace>(`/workspaces/${id}`);
  },

  createWorkspace: async (data: { name: string; description?: string; slug?: string }): Promise<Workspace> => {
    return ApiClient.post<Workspace>('/workspaces', data);
  },

  updateWorkspace: async (id: string, data: { name?: string; description?: string }): Promise<Workspace> => {
    return ApiClient.put<Workspace>(`/workspaces/${id}`, data);
  },

  getWorkspaceMembers: async (id: string): Promise<WorkspaceMember[]> => {
    return ApiClient.get<WorkspaceMember[]>(`/workspaces/${id}/members`);
  },
};
