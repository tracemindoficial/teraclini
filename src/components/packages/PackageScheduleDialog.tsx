import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useFinanceLookup, useSchedulePackage } from "@/lib/data/finance";
import { useServicePrices } from "@/lib/data/basic-registrations";
import { useLocations } from "@/lib/data/locations";
import { useRooms } from "@/lib/data/schedule";
import type { CarePackageWithRefs } from "@/lib/data/packages";
import { contractedTotal, currency, moneyCents, packageDates } from "@/lib/finance-rules";
export function PackageScheduleDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: CarePackageWithRefs | undefined;
  onSaved?: ((id: string) => void) | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ScheduleForm item={item} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
    </Dialog>
  );
}
function ScheduleForm({
  item,
  onClose,
  onSaved,
}: {
  item?: CarePackageWithRefs | undefined;
  onClose: () => void;
  onSaved?: ((id: string) => void) | undefined;
}) {
  const [search, setSearch] = useState("");
  const [patient, setPatient] = useState(item?.patient_id ?? "");
  const [priceId, setPrice] = useState("");
  const [quantity, setQuantity] = useState(
    String(item ? Math.max(1, item.quantity - item.appointments.length) : 4),
  );
  const [discount, setDiscount] = useState("0");
  const [mode, setMode] = useState("prepaid");
  const [frequency, setFrequency] = useState("weekly");
  const [interval, setInterval] = useState("7");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [slots, setSlots] = useState<{ date: string; time: string }[]>([]);
  const [modality, setModality] = useState(item?.scheduled_modality ?? "online");
  const [location, setLocation] = useState("none");
  const [room, setRoom] = useState("none");
  const [key] = useState(() => crypto.randomUUID());
  const patients = useFinanceLookup("patients", search);
  const prices = useServicePrices(true);
  const locations = useLocations();
  const rooms = useRooms(location === "none" ? undefined : location);
  const mutation = useSchedulePackage();
  const price = prices.data?.find((p) => p.id === priceId);
  let total: number | undefined;
  try {
    if (price)
      total = contractedTotal(
        price.price_cents,
        price.package_quantity,
        Number(quantity),
        moneyCents(discount),
      ).total;
  } catch {
    /* validation shown on submit */
  }
  function generate() {
    try {
      setSlots(
        packageDates(
          date,
          time,
          Number(quantity),
          frequency === "fortnightly" ? 14 : frequency === "weekly" ? 7 : Number(interval),
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revise as datas.");
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (slots.length !== Number(quantity))
        throw new Error("Gere e confira todas as datas antes de salvar.");
      await mutation
        .mutateAsync({
          request_key: key,
          package_id: item?.id,
          patient_id: patient,
          service_price_id: priceId,
          quantity: Number(quantity),
          discount_cents: moneyCents(discount),
          finance_mode: mode,
          frequency,
          modality,
          location_id: location === "none" ? null : location,
          room_id: room === "none" ? null : room,
          slots,
          duration_minutes: item?.contracted_duration_minutes ?? 50,
        })
        .then((id) => onSaved?.(id));
      toast.success("Pacote agendado.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível agendar.");
    }
  }
  return (
    <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {item ? "Agendar sessões do pacote" : "Contratar e agendar pacote"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {!item && (
          <>
            <Input
              aria-label="Buscar paciente para pacote"
              placeholder="Buscar paciente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={patient} onValueChange={setPatient}>
              <SelectTrigger aria-label="Paciente do pacote">
                <SelectValue placeholder="Paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceId} onValueChange={setPrice}>
              <SelectTrigger aria-label="Preço do pacote">
                <SelectValue placeholder="Serviço e valor" />
              </SelectTrigger>
              <SelectContent>
                {prices.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.appointment_type.name} · {currency(p.price_cents)}
                    {p.package_quantity ? ` / ${p.package_quantity} sessões` : ""} ·{" "}
                    {p.duration_minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="package-quantity">Quantidade de sessões</Label>
            <Input
              id="package-quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setSlots([]);
              }}
              required
            />
          </div>
          {!item && (
            <div>
              <Label htmlFor="package-discount">Desconto (R$)</Label>
              <Input
                id="package-discount"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                required
              />
            </div>
          )}
        </div>
        {!item && (
          <>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger aria-label="Modelo de pagamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Pré-pago — um título pelo total</SelectItem>
                <SelectItem value="per_session">Por sessão — valor rateado</SelectItem>
              </SelectContent>
            </Select>
            <p className="font-semibold">
              Total contratado: {total === undefined ? "—" : currency(total)}
            </p>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={modality} onValueChange={(v) => setModality(v as "online" | "presencial")}>
            <SelectTrigger aria-label="Modalidade do pacote">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={location}
            onValueChange={(v) => {
              setLocation(v);
              setRoom("none");
            }}
          >
            <SelectTrigger aria-label="Local do pacote">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem local definido</SelectItem>
              {locations.data
                ?.filter((l) => l.is_active)
                .map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {location !== "none" && (
            <Select value={room} onValueChange={setRoom}>
              <SelectTrigger aria-label="Sala do pacote">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem sala</SelectItem>
                {rooms.data
                  ?.filter((r) => r.is_active && r.location_id === location)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Select
          value={frequency}
          onValueChange={(v) => {
            setFrequency(v);
            setSlots([]);
          }}
        >
          <SelectTrigger aria-label="Frequência das sessões">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="fortnightly">Quinzenal</SelectItem>
            <SelectItem value="custom">Personalizada / datas manuais</SelectItem>
          </SelectContent>
        </Select>
        {frequency === "custom" && (
          <div>
            <Label htmlFor="package-interval">Intervalo inicial (dias)</Label>
            <Input
              id="package-interval"
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="package-date">Primeira data</Label>
            <Input
              id="package-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="package-time">Horário</Label>
            <Input
              id="package-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={generate}>
          <CalendarPlus className="mr-2 size-4" />
          Gerar datas
        </Button>
        <ol className="max-h-60 space-y-2 overflow-y-auto">
          {slots.map((slot, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
              <span className="text-xs text-muted-foreground">{i + 1}</span>
              <Input
                aria-label={`Data da sessão ${i + 1}`}
                type="date"
                required
                value={slot.date}
                onChange={(e) =>
                  setSlots((s) => s.map((v, n) => (n === i ? { ...v, date: e.target.value } : v)))
                }
              />
              <Input
                aria-label={`Horário da sessão ${i + 1}`}
                type="time"
                required
                value={slot.time}
                onChange={(e) =>
                  setSlots((s) => s.map((v, n) => (n === i ? { ...v, time: e.target.value } : v)))
                }
              />
            </li>
          ))}
        </ol>
        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending || slots.length === 0 || (!item && (!patient || !priceId))}
        >
          {mutation.isPending ? "Salvando…" : "Salvar pacote e agendamentos"}
        </Button>
      </form>
    </DialogContent>
  );
}
