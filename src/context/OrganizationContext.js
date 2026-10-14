"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setActiveOrganization(null);
      setLoading(false);
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
        
        // Load active org from localStorage or default to first
        const savedOrgId = localStorage.getItem('activeOrganizationId');
        if (savedOrgId && data.organizations.some(o => o._id === savedOrgId)) {
          setActiveOrganization(data.organizations.find(o => o._id === savedOrgId));
        } else if (data.organizations.length > 0) {
          setActiveOrganization(data.organizations[0]);
          localStorage.setItem('activeOrganizationId', data.organizations[0]._id);
        } else {
          setActiveOrganization(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orgs', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (orgId) => {
    const org = organizations.find(o => o._id === orgId);
    if (org) {
      setActiveOrganization(org);
      localStorage.setItem('activeOrganizationId', org._id);
      // Optional: trigger a re-fetch of dashboard data by emitting an event or just let pages react to activeOrganization change
    }
  };

  return (
    <OrganizationContext.Provider value={{ organizations, activeOrganization, loading, switchOrganization, refreshOrganizations: fetchOrganizations }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === null) {
    return { organizations: [], activeOrganization: null, loading: true, switchOrganization: () => {}, refreshOrganizations: () => {} };
  }
  return context;
};
