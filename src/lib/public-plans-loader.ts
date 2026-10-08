import type { PublicPlan } from "./public-commercial.functions";

// Public pricing is optional content, never a prerequisite for accessing the site.
// Keep a failed lookup distinct from a successful empty catalogue.
export async function loadPublicPlans(fetchPlans: () => Promise<PublicPlan[]>) {
  try {
    return { plans: await fetchPlans(), unavailable: false };
  } catch {
    return { plans: [] as PublicPlan[], unavailable: true };
  }
}