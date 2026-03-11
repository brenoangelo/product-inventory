"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { OrganizationsService } from "@/lib/services/organizations";
import type { Organization, OrganizationMember } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface OrganizationContextValue {
  organization: Organization | null;
  membership: OrganizationMember | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue>({
  organization: null,
  membership: null,
  isLoading: true,
  refresh: async () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOrganization(null);
        setMembership(null);
        return;
      }

      const result = await OrganizationsService.getCurrent();
      if (result) {
        setOrganization(result.organization);
        setMembership(result.membership);
      } else {
        setOrganization(null);
        setMembership(null);
      }
    } catch {
      setOrganization(null);
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        refresh();
      }
      if (event === "SIGNED_OUT") {
        setOrganization(null);
        setMembership(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  return (
    <OrganizationContext.Provider
      value={{ organization, membership, isLoading, refresh }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
