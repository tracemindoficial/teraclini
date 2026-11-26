import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { COMPLETE_PLAN_CODE } from "@/lib/subscription-rules";

export type PublicPlan = Pick<
  Database["public"]["Tables"]["subscription_plans"]["Row"],
  | "id"
  | "code"
  | "name"
  | "price_cents"
  | "reference_price_cents"
  | "currency"
  | "billing_interval_months"
>;

export const getPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const runtimeUrl = process.env["SUPABASE_URL"];
  const runtimeKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const [url, publishableKey] =
    runtimeUrl && runtimeKey
      ? [runtimeUrl, runtimeKey]
      : [
          import.meta.env.VITE_SUPABASE_URL || process.env["VITE_SUPABASE_URL"],
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
        ];
  if (!url || !publishableKey) {
    throw new Error("O catálogo público não está conectado ao banco de dados.");
  }

  // A consulta pública não herda a sessão do visitante nem usa a chave administrativa.
  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
        // A chave publicável opaca é enviada em apikey, não como um JWT.
        if (
          publishableKey.startsWith("sb_publishable_") &&
          headers.get("Authorization") === `Bearer ${publishableKey}`
        ) {
          headers.delete("Authorization");
        }
        return fetch(input, { ...init, headers, cache: "no-store" });
      },
    },
  });
  const { data, error } = await client
    .from("subscription_plans")
    .select("id, code, name, price_cents, reference_price_cents, currency, billing_interval_months")
    .eq("code", COMPLETE_PLAN_CODE)
    .eq("is_active", true)
    .eq("currency", "BRL")
    .eq("billing_interval_months", 1)
    .gt("price_cents", 0);

  if (error) throw new Error("Não foi possível consultar as licenças disponíveis.");
  return data satisfies PublicPlan[];
});
