import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess } from "@/lib/platform-admin.functions";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    try {
      await getAdminAccess();
    } catch {
      throw redirect({ to: "/meu-dia" });
    }
  },
  component: () => <Outlet />,
});
