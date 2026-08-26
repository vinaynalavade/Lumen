import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Organization, OrganizationRole } from '../types';
import { organizationApi } from '../services/organizationApi';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentUserOrgRole: OrganizationRole | null;
  isLoading: boolean;
  selectOrganization: (organizationId: string) => void;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, description?: string) => Promise<Organization>;
  isOwnerOrAdmin: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'lumen_active_organization_id';

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrganizations = async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await organizationApi.getOrganizations();
      setOrganizations(data);

      if (data.length > 0) {
        const savedOrgId = localStorage.getItem(STORAGE_KEY);
        const matched = data.find((org) => org.id === savedOrgId);
        const selected = matched || data[0];
        setCurrentOrganization(selected);
        localStorage.setItem(STORAGE_KEY, selected.id);
      } else {
        setCurrentOrganization(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [isAuthenticated, user?.id]);

  const selectOrganization = (organizationId: string) => {
    const org = organizations.find((o) => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem(STORAGE_KEY, org.id);
    }
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  const createOrganization = async (name: string, description?: string): Promise<Organization> => {
    const newOrg = await organizationApi.createOrganization({
      name,
      description,
      create_default_workspace: true,
    });
    await fetchOrganizations();
    selectOrganization(newOrg.id);
    return newOrg;
  };

  const currentUserOrgRole = currentOrganization?.current_user_role || null;
  const isOwnerOrAdmin =
    currentUserOrgRole === 'OWNER' ||
    currentUserOrgRole === 'ADMIN' ||
    Boolean(user?.is_superuser);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        currentUserOrgRole,
        isLoading,
        selectOrganization,
        refreshOrganizations,
        createOrganization,
        isOwnerOrAdmin,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
