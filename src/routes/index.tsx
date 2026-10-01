import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, FolderLock, MapPin, Smartphone } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeraClini — sua prática clínica em um só lugar" },
      {
        name: "description",
        content:
          "Agenda única, pacientes, prontuário, anamneses e evoluções que pertencem a você — não à clínica.",
      },
      { property: "og:title", content: "TeraClini" },
      {
        property: "og:description",
        content: "A clínica muda. Sua prática continua com você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandLogo className="w-40 sm:w-48" />
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main>
        <section className="border-y bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Feito para profissionais independentes
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-6xl">
                Sua prática clínica. Em um só lugar.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Uma agenda única para todos os lugares onde você atende, com pacientes, prontuário,
            anamneses e evoluções que pertencem à sua conta — em qualquer clínica, consultório ou
            atendimento online.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Criar minha conta <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">Já tenho conta</Link>
                </Button>
              </div>
            </div>
            <div className="brand-panel hidden min-h-72 items-end p-8 lg:flex">
              <p className="max-w-xs text-2xl font-medium leading-snug text-primary-foreground">
                A clínica muda. Sua prática continua com você.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 sm:grid-cols-2 sm:px-8 sm:py-14 lg:grid-cols-4">
          <Feature
            icon={<CalendarDays className="size-5" />}
            title="Uma agenda só"
            text="Todos os locais em uma visão. Segunda na clínica, quarta no consultório, quinta online."
          />
          <Feature
            icon={<MapPin className="size-5" />}
            title="O local é do atendimento"
            text="Cadastre quantos locais quiser. Trocar de clínica não move nem apaga nada."
          />
          <Feature
            icon={<FolderLock className="size-5" />}
            title="Histórico que fica com você"
            text="Prontuário cronológico, anamneses, evoluções e documentos guardados em área privada."
          />
          <Feature
            icon={<Smartphone className="size-5" />}
            title="Feito para o celular"
            text="Consultar, agendar e registrar a evolução entre um atendimento e outro."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="surface p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
