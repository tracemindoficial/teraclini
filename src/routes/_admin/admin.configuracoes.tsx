import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { brlFromCents } from "@/lib/admin-metrics";
import { useAdminSettings, useUpsertAdminSetting } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_admin/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Administração TeraClini" },
      { name: "description", content: "Configurações comerciais do TeraClini." },
      { property: "og:title", content: "Configurações — Administração TeraClini" },
      { property: "og:description", content: "Configurações comerciais do TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSettingsPage,
});
function AdminSettingsPage() {
  const { data, isLoading, error } = useAdminSettings();
  const save = useUpsertAdminSetting();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Confirma a gravação desta configuração global?")) return;
    try {
      await save.mutateAsync({
        key: key.trim(),
        value,
        description: description.trim() || null,
        confirm: true,
      });
      setKey("");
      setValue("");
      setDescription("");
      toast.success("Configuração salva.");
    } catch {
      toast.error("Não foi possível salvar a configuração.");
    }
  }
  return (
    <AdminShell title="Configurações" description="Parâmetros comerciais não secretos">
      {isLoading ? (
        <AdminState kind="loading">Carregando configurações...</AdminState>
      ) : error ? (
        <AdminState kind="error">Não foi possível carregar as configurações.</AdminState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="surface p-5">
            <h2 className="font-semibold">Planos</h2>
            {data?.plans.length ? (
              <ul className="mt-4 divide-y">
                {data.plans.map((plan) => (
                  <li key={plan.id} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Primeiro pagamento em {plan.first_payment_days} dias · tolerância de{" "}
                          {plan.grace_period_days} dias
                        </p>
                      </div>
                      <strong>{brlFromCents(plan.price_cents)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum plano foi ativado. Os parâmetros comerciais aguardam confirmação.
              </p>
            )}
          </section>
          <section className="surface p-5">
            <h2 className="font-semibold">Operação financeira</h2>
            {data?.settings.length ? (
              <dl className="mt-4 divide-y">
                {data.settings.map((setting) => (
                  <div key={setting.id} className="py-3">
                    <dt className="text-sm font-medium">{setting.setting_key}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">
                      {setting.description ?? "Configuração administrativa"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma configuração comercial está ativa. Cobranças, notificações e restrições
                automáticas permanecem desativadas.
              </p>
            )}
          </section>
          <section className="surface p-5 lg:col-span-2">
            <h2 className="font-semibold">Adicionar configuração global</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use apenas parâmetros operacionais não secretos. Planos e cobranças automáticas
              permanecem desativados.
            </p>
            <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="setting-key">Identificador</Label>
                <Input
                  id="setting-key"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="exemplo.configuracao"
                  pattern="[a-z0-9_.-]+"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-value">Valor</Label>
                <Input
                  id="setting-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-description">Descrição</Label>
                <Input
                  id="setting-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={300}
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={save.isPending}>
                  Salvar configuração
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
