"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOrganization } from "@/hooks/use-organization";
import { CreateOrg } from "@/components/onboarding/create-org";
import { createClient } from "@/lib/supabase/client";

export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { organization, isLoading, refresh } = useOrganization();
  const [autoCreating, setAutoCreating] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading || organization || attempted.current || autoCreating) return;

    attempted.current = true;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const orgName = user?.user_metadata?.organization_name as string | undefined;
      if (!orgName) return;

      setAutoCreating(true);
      const { error } = await supabase.rpc("create_org_for_user", {
        org_name: orgName,
      });

      if (!error) {
        await refresh();
      } else {
        console.error("Auto-create org failed", error);
      }
      setAutoCreating(false);
    });
  }, [isLoading, organization, refresh, autoCreating]);

  if (isLoading || autoCreating) {
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
