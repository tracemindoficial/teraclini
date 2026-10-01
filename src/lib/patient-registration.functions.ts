import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { registrationPayloadSchema } from "@/lib/patient-registration-schema";

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const createPatientRegistrationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ daysValid: z.number().int().min(1).max(30), label: z.string().trim().max(120).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + data.daysValid * 86_400_000).toISOString();
    const { error } = await context.supabase.from("patient_registration_links").insert({ token_hash: tokenHash, expires_at: expiresAt, label: data.label || null });
    if (error) throw new Error("Não foi possível gerar o link agora.");
    return { token, expiresAt };
  });

export const submitPatientRegistration = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().length(64), payload: registrationPayloadSchema }).parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const source = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const tokenHash = await sha256(data.token);
    const bucketKey = await sha256(`${source}:${tokenHash}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: requestId, error } = await supabaseAdmin.rpc("submit_patient_registration", { _token_hash: tokenHash, _bucket_key: bucketKey, _payload: data.payload });
    if (error || !requestId) {
      const message = error?.message.includes("Muitas tentativas") ? "Muitas tentativas. Aguarde antes de tentar novamente." : error?.message.includes("não está mais disponível") ? "Este link não está mais disponível." : "Não foi possível enviar seu cadastro. Revise os dados e tente novamente.";
      throw new Error(message);
    }
    return { requestId };
  });

export const checkPatientRegistrationLink = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().length(64) }).parse(input))
  .handler(async ({ data }) => {
    const tokenHash = await sha256(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin
      .from("patient_registration_links")
      .select("expires_at, max_uses, revoked_at, uses_count")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error || !link) return { available: false as const, reason: "invalid" as const };
    if (link.revoked_at) return { available: false as const, reason: "revoked" as const };
    if (new Date(link.expires_at) <= new Date()) return { available: false as const, reason: "expired" as const };
    if (link.uses_count >= link.max_uses) return { available: false as const, reason: "used" as const };
    return { available: true as const };
  });
