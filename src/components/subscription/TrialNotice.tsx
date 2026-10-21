import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { useMyCommercialStatus } from "@/lib/data/subscription";
import { daysRemaining } from "@/lib/subscription-rules";

export function TrialNotice() {
  const { data } = useMyCommercialStatus();
  if (!data || data.state !== "trial" || !data.trial) return null;
  const left = daysRemaining(data.trial.ends_at);
  const unread = data.notifications.find((n) => n.kind === "trial_day5" && !n.read_at);
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <span className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        {unread
          ? unread.title
          : `Teste gratuito: ${left} ${left === 1 ? "dia restante" : "dias restantes"}`}
      </span>
      <Link to="/assinatura" className="font-medium text-primary underline-offset-4 hover:underline">
        Ver opções de assinatura
      </Link>
    </div>
  );
}
