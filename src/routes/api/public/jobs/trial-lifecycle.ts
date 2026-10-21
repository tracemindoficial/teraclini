import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/trial-lifecycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("process_trial_lifecycle", {
          _source: "schedule",
        });
        if (error) {
          console.error("trial-lifecycle failed", error.message);
          return Response.json({ success: false }, { status: 500 });
        }
        return Response.json({ success: true, result: data });
      },
    },
  },
});
