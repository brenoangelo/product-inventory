"use client";

import { Loader2 } from "lucide-react";
import { useOrganization } from "@/hooks/use-organization";
import { CreateOrg } from "@/components/onboarding/create-org";

export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return <CreateOrg />;
  }

  return <>{children}</>;
}
