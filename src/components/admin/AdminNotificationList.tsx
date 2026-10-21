import { Check, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminNotificationItem {
  key: string;
  kind: string;
  title: string;
  detail: string;
  date: string;
  to: string;
  read: boolean;
}

export function AdminNotificationList({
  items,
  onRead,
  compact = false,
}: {
  items: AdminNotificationItem[];
  onRead: (key: string) => Promise<unknown>;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  async function open(item: AdminNotificationItem) {
    if (!item.read) await onRead(item.key);
    const target = new URL(item.to, window.location.origin);
    if (target.pathname === "/admin/suporte") {
      await navigate({
        to: "/admin/suporte",
        search: { ticket: target.searchParams.get("ticket") ?? undefined },
      });
      return;
    }
    const professional = target.pathname.match(/^\/admin\/profissionais\/([0-9a-f-]{36})$/);
    if (professional) {
      await navigate({ to: "/admin/profissionais/$id", params: { id: professional[1] ?? "" } });
      return;
    }
    if (target.pathname === "/admin/profissionais" || target.pathname === "/admin/assinaturas") {
      await navigate({ to: "/admin/profissionais" });
      return;
    }
    if (target.pathname === "/admin/pagamentos") {
      await navigate({
        to: "/admin/pagamentos",
        search: { payment: target.searchParams.get("payment") ?? undefined },
      });
      return;
    }
    await navigate({ href: item.to });
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <article
          key={item.key}
          className={cn(
            "rounded-lg border p-3",
            item.read ? "bg-muted/30" : "border-primary/30 bg-card",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className={cn("text-xs text-muted-foreground", compact && "truncate")}>
                {item.detail}
              </p>
            </div>
            {!item.read ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Marcar como lida"
                onClick={() => void onRead(item.key)}
              >
                <Check className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <time className="text-xs text-muted-foreground">
              {new Date(item.date).toLocaleString("pt-BR")}
            </time>
            <Button size="sm" variant="ghost" onClick={() => void open(item)}>
              <ExternalLink className="mr-1 size-3" />
              Abrir
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
