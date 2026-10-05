export const SERVICE_CATEGORIES = [["atendimento", "Atendimento"], ["avaliacao", "Avaliação"], ["reuniao", "Reunião"], ["devolutiva", "Devolutiva"], ["outro", "Outro"]] as const;
export const PRICE_MODALITIES = [["presencial", "Presencial"], ["online", "Online"], ["hibrido", "Híbrido"], ["todas", "Todas"]] as const;
export type BillingType = "avulso" | "pacote";
export function normalizeRegistrationName(value: string) { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR"); }
export function reaisToCents(value: string) { const normalized = value.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", "."); const number = Number(normalized); return Number.isFinite(number) ? Math.round(number * 100) : null; }
export function centsToReais(cents: number) { return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
export function packageUnitCents(totalCents: number, quantity: number) { return Number.isInteger(quantity) && quantity > 0 && totalCents >= 0 ? Math.round(totalCents / quantity) : null; }
export function modalityMatches(priceModality: string, appointmentModality: string) { return priceModality === "todas" || priceModality === "hibrido" || priceModality === appointmentModality; }