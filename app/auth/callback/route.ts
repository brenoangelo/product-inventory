import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user already belongs to an organization
        const { data: existing } = await supabase
          .from("organization_members")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          // Check for pending invitation
          const { data: invitations } = await supabase
            .from("invitations")
            .select("*")
            .eq("email", user.email ?? "")
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
            .limit(1);

          const invitation = invitations?.[0];

          if (invitation) {
            // Accept invitation: join existing org
            await supabase.from("organization_members").insert({
              organization_id: invitation.organization_id,
              user_id: user.id,
              role: invitation.role,
            });

            await supabase
              .from("invitations")
              .update({ accepted_at: new Date().toISOString() })
              .eq("id", invitation.id);
          } else {
            // No invitation → create org via SECURITY DEFINER function
            const orgName =
              (user.user_metadata?.organization_name as string) ||
              user.email?.split("@")[0] ||
              "Minha Organização";

            await supabase.rpc("create_org_for_user", { org_name: orgName });
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
