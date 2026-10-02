import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminUsageMetrics } from "@/lib/admin-analytics.functions";
export function useAdminUsageMetrics() {
  const fn = useServerFn(getAdminUsageMetrics);
  return useQuery({ queryKey: ["admin", "usage-metrics"], queryFn: () => fn() });
}
