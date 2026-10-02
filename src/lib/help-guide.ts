import { HELP_GUIDE_STORAGE_KEY } from "@/lib/help-types";

export function startHelpGuide(slug: string, routePath: string | null) {
  window.localStorage.setItem(HELP_GUIDE_STORAGE_KEY, slug);
  window.dispatchEvent(new Event("teraclini-help-guide"));
  return routePath;
}
