import { addDays, format, parseISO } from "date-fns";
export function moneyCents(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Informe um valor com até duas casas decimais.");
  const [whole = '0', fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 2147483647) throw new Error("Valor fora do limite permitido.");
  return cents;
}
export const currency = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function financeBalance(contracted: number, receipts: { amount_cents: number; status: string }[], cancelled = false) {
  const received = receipts.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + r.amount_cents, 0);
  return { received, balance: Math.max(0, contracted - received), status: cancelled ? 'cancelled' : received >= contracted ? 'paid' : received > 0 ? 'partial' : 'pending' };
}
export function allocateCents(total: number, quantity: number) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isInteger(quantity) || quantity < 1) throw new Error('Contrato inválido.');
  return Array.from({ length: quantity }, (_, i) => Math.floor(total / quantity) + (i < total % quantity ? 1 : 0));
}
export function packageDates(date: string, time: string, quantity: number, days: number) {
  if (!date || !time || !Number.isInteger(quantity) || quantity < 1 || days < 1) throw new Error('Revise datas e quantidade.');
  return Array.from({ length: quantity }, (_, i) => ({ date: format(addDays(parseISO(date), days * i), 'yyyy-MM-dd'), time }));
}
export function contractedTotal(price: number, offerQuantity: number | null, quantity: number, discount: number) {
  if (quantity < 1 || discount < 0) throw new Error('Revise quantidade e desconto.');
  const unit = offerQuantity ? Math.round(price / offerQuantity) : price;
  const total = (offerQuantity === quantity ? price : unit * quantity) - discount;
  if (total < 0) throw new Error('Desconto maior que o contrato.');
  return { unit, total };
}
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}
