import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAdminHelp,
  saveAdminHelpCategory,
  saveAdminHelpTutorial,
  toggleAdminHelpTutorial,
} from "@/lib/help-admin.functions";

const key = ["admin", "help"] as const;
export function useAdminHelp() {
  const fn = useServerFn(listAdminHelp);
  return useQuery({ queryKey: key, queryFn: () => fn() });
}
export function useSaveAdminHelpTutorial() {
  const fn = useServerFn(saveAdminHelpTutorial);
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]) => fn(data),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
export function useToggleAdminHelpTutorial() {
  const fn = useServerFn(toggleAdminHelpTutorial);
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]) => fn(data),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
export function useSaveAdminHelpCategory() {
  const fn = useServerFn(saveAdminHelpCategory);
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]) => fn(data),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
