import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireHelpAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) throw new Response("Forbidden", { status: 403 });
    return next({ context: { ...context, supabaseAdmin } });
  });

const tutorialInput = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  title: z.string().min(3).max(140),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shortDescription: z.string().min(10).max(300),
  objective: z.string().min(10).max(500),
  content: z.string().max(10000),
  expectedResult: z.string().max(1000),
  keywords: z.array(z.string().min(1).max(50)).max(30),
  routePath: z.string().max(200).nullable(),
  visibility: z.enum(["all", "professional", "admin"]),
  orderIndex: z.number().int().min(0),
  isActive: z.boolean(),
  mediaUrl: z.string().url().nullable(),
  steps: z
    .array(
      z.object({ title: z.string().min(2).max(140), instruction: z.string().min(5).max(1000) }),
    )
    .max(30),
});

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(300).nullable(),
  orderIndex: z.number().int().min(0),
  isActive: z.boolean(),
});

export const listAdminHelp = createServerFn({ method: "GET" })
  .middleware([requireHelpAdmin])
  .handler(async ({ context }) => {
    const [categories, tutorials, events] = await Promise.all([
      context.supabaseAdmin.from("help_categories").select("*").order("order_index"),
      context.supabaseAdmin
        .from("help_tutorials")
        .select("*,help_tutorial_steps(id,title,instruction,target_selector,order_index)")
        .order("order_index"),
      context.supabaseAdmin
        .from("help_events")
        .select("event_type,search_term,tutorial_id")
        .order("occurred_at", { ascending: false })
        .limit(500),
    ]);
    const error = categories.error ?? tutorials.error ?? events.error;
    if (error) throw new Error("Não foi possível carregar a gestão da ajuda.");
    return {
      categories: categories.data ?? [],
      tutorials: tutorials.data ?? [],
      events: events.data ?? [],
    };
  });

export const saveAdminHelpTutorial = createServerFn({ method: "POST" })
  .middleware([requireHelpAdmin])
  .inputValidator((data) => tutorialInput.parse(data))
  .handler(async ({ context, data }) => {
    const payload = {
      category_id: data.categoryId,
      title: data.title,
      slug: data.slug,
      short_description: data.shortDescription,
      objective: data.objective,
      content: data.content,
      expected_result: data.expectedResult,
      keywords: data.keywords,
      route_path: data.routePath,
      visibility: data.visibility,
      order_index: data.orderIndex,
      is_active: data.isActive,
      media_url: data.mediaUrl,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await context.supabaseAdmin
          .from("help_tutorials")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabaseAdmin.from("help_tutorials").insert(payload).select("id").single();
    if (result.error) throw new Error("Não foi possível salvar o tutorial.");
    if (data.id) {
      const { error: deleteError } = await context.supabaseAdmin
        .from("help_tutorial_steps")
        .delete()
        .eq("tutorial_id", result.data.id);
      if (deleteError) throw new Error("Não foi possível atualizar as etapas do tutorial.");
    }
    if (data.steps.length) {
      const { error: stepsError } = await context.supabaseAdmin.from("help_tutorial_steps").insert(
        data.steps.map((step, index) => ({
          tutorial_id: result.data.id,
          title: step.title,
          instruction: step.instruction,
          order_index: index,
        })),
      );
      if (stepsError) throw new Error("Não foi possível salvar as etapas do tutorial.");
    }
    await context.supabaseAdmin.from("platform_audit_events").insert({
      actor_user_id: context.userId,
      action: data.id ? "help_tutorial.updated" : "help_tutorial.created",
      entity_type: "help_tutorial",
      entity_id: result.data.id,
      changed_fields: Object.keys(payload),
      result: "success",
    });
    return result.data;
  });

export const toggleAdminHelpTutorial = createServerFn({ method: "POST" })
  .middleware([requireHelpAdmin])
  .inputValidator((data) =>
    z
      .object({ id: z.string().uuid(), isActive: z.boolean(), confirm: z.literal(true) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabaseAdmin
      .from("help_tutorials")
      .update({ is_active: data.isActive, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível alterar o tutorial.");
    await context.supabaseAdmin.from("platform_audit_events").insert({
      actor_user_id: context.userId,
      action: data.isActive ? "help_tutorial.activated" : "help_tutorial.deactivated",
      entity_type: "help_tutorial",
      entity_id: data.id,
      changed_fields: ["is_active"],
      result: "success",
    });
    return { ok: true as const };
  });

export const saveAdminHelpCategory = createServerFn({ method: "POST" })
  .middleware([requireHelpAdmin])
  .inputValidator((data) => categoryInput.parse(data))
  .handler(async ({ context, data }) => {
    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      order_index: data.orderIndex,
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await context.supabaseAdmin
          .from("help_categories")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabaseAdmin.from("help_categories").insert(payload).select("id").single();
    if (result.error) throw new Error("Não foi possível salvar a categoria.");
    await context.supabaseAdmin.from("platform_audit_events").insert({
      actor_user_id: context.userId,
      action: data.id ? "help_category.updated" : "help_category.created",
      entity_type: "help_category",
      entity_id: result.data.id,
      changed_fields: Object.keys(payload),
      result: "success",
    });
    return result.data;
  });
