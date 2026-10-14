"use client"

import { AuthProvider } from "@/context/AuthContext";
import { OrganizationProvider } from "@/context/OrganizationContext";

export function Providers({ children }) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </AuthProvider>
  );
}
