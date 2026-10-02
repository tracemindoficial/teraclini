export type HelpStep = {
  id: string;
  title: string;
  instruction: string;
  target_selector: string | null;
  order_index: number;
};

export type HelpCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  order_index: number;
};

export type HelpTutorial = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  short_description: string;
  objective: string;
  content: string;
  expected_result: string;
  keywords: string[];
  route_path: string | null;
  visibility: "all" | "professional" | "admin";
  order_index: number;
  is_active: boolean;
  media_url: string | null;
  category?: HelpCategory;
  steps?: HelpStep[];
};

export const HELP_GUIDE_STORAGE_KEY = "teraclini-active-help-guide";
export const HELP_INTRO_STORAGE_KEY = "teraclini-help-introduction-seen";