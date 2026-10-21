import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/platform-admin.functions";
import type { ProfessionalInfo } from "@/lib/professional-status";

export type ProfessionalCounts = {
  total: number;
  incomplete: number;
  with_access: number;
  trial: number;
  trial_ending: number;
  trial_expired: number;
  active: number;
  suspended: number;
  payment_pending: number;
  overdue: number;
};

export type ProfessionalRow = {
  account_id: string;
  user_id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  info: ProfessionalInfo;
};

export const professionalFilters = z.object({
  search: z.string().max(120),
  status: z.string().max(40),
  access: z.string().max(40),
  financial: z.string().max(40),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sort: z.enum(["newest", "oldest", "last_activity", "access_end", "next_due"]),
  page: z.number().int().min(1).max(1000),
});

export const listProfessionals = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator(professionalFilters)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabaseAdmin.rpc("admin_professional_directory", {
      _actor_user_id: context.userId,
      _search: data.search,
      _status: data.status,
      _access: data.access,
      _financial: data.financial,
      _from: data.from as string,
      _to: data.to as string,
      _sort: data.sort,
      _page: data.page,
      _page_size: 20,
    });
    if (error) throw new Error(error.message || "Não foi possível carregar os profissionais.");
    return result as unknown as {
      counts: ProfessionalCounts;
      total: number;
      page_size: number;
      rows: ProfessionalRow[];
    };
  });
