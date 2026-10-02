import { supabase } from "@/integrations/supabase/client";

export type CommercialEvent =
  | "landing_view"
  | "plans_view"
  | "signup_click"
  | "login_click"
  | "plan_select";

export function trackCommercialEvent(
  eventType: CommercialEvent,
  options: { planCode?: string; pagePath?: "/" | "/planos" | "/auth" } = {},
) {
  void supabase
    .from("commercial_conversion_events")
    .insert({
      event_type: eventType,
      page_path: options.pagePath ?? "/",
      plan_code: options.planCode ?? null,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn("Evento comercial não registrado.");
    });
}