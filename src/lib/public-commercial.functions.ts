import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type PublicPlan = Pick<
  Database["public"]["Tables"]["subscription_plans"]["Row"],
  "id" | "code" | "name" | "price_cents" | "currency" | "billing_interval_months"
>;

export const getPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["VITE_SUPABASE_URL"];
  const publishableKey = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !publishableKey) return [] satisfies PublicPlan[];

  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("subscription_plans")
    .select("id, code, name, price_cents, currency, billing_interval_months")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  if (error) throw new Error("Não foi possível consultar as licenças disponíveis.");
  return data satisfies PublicPlan[];
});