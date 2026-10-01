import { PROFESSIONS } from "@/lib/domain";

export function splitProfession(profession?: string | null) {
  const listed = Boolean(profession && PROFESSIONS.includes(profession));
  return {
    profession: listed ? (profession ?? "") : profession ? "Outra" : "",
    otherProfession: listed ? "" : (profession ?? ""),
  };
}

export function joinProfession(profession: string, otherProfession: string) {
  return profession === "Outra" ? otherProfession.trim() : profession;
}
