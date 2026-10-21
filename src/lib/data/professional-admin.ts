import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { z } from "zod";

import { listProfessionals, type professionalFilters } from "@/lib/professional-admin.functions";

export type ProfessionalFilters = z.infer<typeof professionalFilters>;

export const professionalKeys = {
  directory: (f: ProfessionalFilters) => ["admin", "professionals", f] as const,
};

export function useProfessionalDirectory(filters: ProfessionalFilters) {
  const fn = useServerFn(listProfessionals);
  return useQuery({
    queryKey: professionalKeys.directory(filters),
    queryFn: () => fn({ data: filters }),
    placeholderData: keepPreviousData,
  });
}
