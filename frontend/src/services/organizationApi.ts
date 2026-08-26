import { ApiClient } from './api';
import type {
  Organization,
  OrganizationMember,
  OrganizationInvite,
  OrganizationInvitePublic,
  OrganizationJoinCode,
  OrganizationRole,
} from '../types';

export const organizationApi = {
  getOrganizations: async (): Promise<Organization[]> => {
    return ApiClient.get<Organization[]>('/organizations');
  },

  createOrganization: async (data: {
    name: string;
    description?: string;
    create_default_workspace?: boolean;
    default_workspace_name?: string;
  }): Promise<Organization> => {
    return ApiClient.post<Organization>('/organizations', data);
  },

  getOrganization: async (id: string): Promise<Organization> => {
    return ApiClient.get<Organization>(`/organizations/${id}`);
  },

  updateOrganization: async (
    id: string,
    data: { name?: string; description?: string }
  ): Promise<Organization> => {
    return ApiClient.put<Organization>(`/organizations/${id}`, data);
  },

  deleteOrganization: async (id: string): Promise<void> => {
    return ApiClient.delete<void>(`/organizations/${id}`);
  },

  // Members
  getMembers: async (organizationId: string): Promise<OrganizationMember[]> => {
    return ApiClient.get<OrganizationMember[]>(`/organizations/${organizationId}/members`);
  },

  addMember: async (
    organizationId: string,
    data: { email: string; role?: OrganizationRole }
  ): Promise<OrganizationMember> => {
    return ApiClient.post<OrganizationMember>(`/organizations/${organizationId}/members`, data);
  },

  updateMemberRole: async (
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<OrganizationMember> => {
    return ApiClient.put<OrganizationMember>(
      `/organizations/${organizationId}/members/${userId}`,
      { role }
    );
  },

  removeMember: async (organizationId: string, userId: string): Promise<void> => {
    return ApiClient.delete<void>(`/organizations/${organizationId}/members/${userId}`);
  },

  // Invites
  getInvites: async (organizationId: string): Promise<OrganizationInvite[]> => {
    return ApiClient.get<OrganizationInvite[]>(`/organizations/${organizationId}/invites`);
  },

  createInvite: async (
    organizationId: string,
    data: { role?: OrganizationRole; expires_in_days?: number; max_uses?: number }
  ): Promise<OrganizationInvite> => {
    return ApiClient.post<OrganizationInvite>(`/organizations/${organizationId}/invites`, data);
  },

  revokeInvite: async (organizationId: string, inviteId: string): Promise<void> => {
    return ApiClient.delete<void>(`/organizations/${organizationId}/invites/${inviteId}`);
  },

  getPublicInvitePreview: async (token: string): Promise<OrganizationInvitePublic> => {
    return ApiClient.get<OrganizationInvitePublic>(`/invites/${token}`);
  },

  acceptInvite: async (token: string): Promise<Organization> => {
    return ApiClient.post<Organization>(`/invites/${token}/accept`);
  },

  // Join Codes
  getJoinCode: async (organizationId: string): Promise<OrganizationJoinCode> => {
    return ApiClient.get<OrganizationJoinCode>(`/organizations/${organizationId}/join-code`);
  },

  regenerateJoinCode: async (organizationId: string): Promise<OrganizationJoinCode> => {
    return ApiClient.post<OrganizationJoinCode>(`/organizations/${organizationId}/join-code/regenerate`);
  },

  toggleJoinCode: async (organizationId: string, isActive: boolean): Promise<OrganizationJoinCode> => {
    return ApiClient.put<OrganizationJoinCode>(
      `/organizations/${organizationId}/join-code/toggle?is_active=${isActive}`
    );
  },

  joinByCode: async (joinCode: string): Promise<Organization> => {
    return ApiClient.post<Organization>('/organizations/join-by-code', {
      join_code: joinCode,
    });
  },
};
