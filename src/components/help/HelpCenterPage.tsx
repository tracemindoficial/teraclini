import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, HelpCircle, Search } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordHelpEvent, useHelpCenter } from "@/lib/data/help";

const FAQ = [
  ["Meus pacientes pertencem a uma clínica?", "Não. Os pacientes e a história clínica pertencem ao espaço profissional da sua conta."],
  ["Posso atender em mais de um local?", "Sim. Cadastre consultórios e opções online e escolha o local em cada atendimento."],
  ["Quando um pacote consome uma sessão?", "Somente quando o atendimento vinculado é marcado como realizado."],
  ["Como peço ajuda adicional?", "Use Solicitar ajuda para conferir as opções disponíveis. Nenhum canal externo é presumido pelo sistema."],
] as const;

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function HelpCenterPage() {
  const { data, isLoading, error } = useHelpCenter();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedTerm = normalize(term.trim());
  const tutorials = useMemo(() => (data?.tutorials ?? []).filter((item) => {
    const searchable = normalize([item.title, item.short_description, item.objective, item.content, ...item.keywords, data?.categories.find((entry) => entry.id === item.category_id)?.name ?? ""].join(" "));
    return (category === "all" || item.category_id === category) && (!normalizedTerm || searchable.includes(normalizedTerm));
  }), [category, data, normalizedTerm]);

  function trackSearch() {
    if (!term.trim()) return;
    recordHelpEvent({ eventType: tutorials.length ? "search" : "no_results", searchTerm: term, hasResults: tutorials.length > 0 }).catch(() => undefined);
  }

  return <div className="space-y-8">
    <section className="border-b pb-7">
      <p className="text-sm font-medium text-primary">Orientação no seu ritmo</p>
      <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Como podemos ajudar?</h2>
      <div className="relative mt-5 max-w-2xl"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={term} onChange={(event) => setTerm(event.target.value)} onBlur={trackSearch} onKeyDown={(event) => event.key === "Enter" && trackSearch()} placeholder="Busque por agenda, evolução, paciente, senha..." className="h-11 pl-10" aria-label="Buscar na Central de Ajuda" /></div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1"><Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")}>Todos</Button>{data?.categories.map((item) => <Button key={item.id} size="sm" variant={category === item.id ? "default" : "outline"} onClick={() => setCategory(item.id)} className="shrink-0">{item.name}</Button>)}</div>
    </section>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando orientações...</p> : error ? <p className="text-sm text-destructive">Não foi possível carregar a Central de Ajuda.</p> : tutorials.length ? <section><h2 className="mb-4 text-lg font-semibold">Tutoriais</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tutorials.map((item) => <Link key={item.id} to="/ajuda/$slug" params={{ slug: item.slug }} className="surface group p-5 transition-shadow hover:shadow-[var(--shadow-lift)]" onClick={() => recordHelpEvent({ eventType: "view", tutorialId: item.id }).catch(() => undefined)}><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><BookOpen className="size-5" /></div><div className="min-w-0"><p className="font-semibold group-hover:text-primary">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.short_description}</p></div><ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" /></div></Link>)}</div></section> : <section className="surface p-8 text-center"><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Nenhum resultado encontrado</h2><p className="mt-1 text-sm text-muted-foreground">Tente uma palavra diferente ou escolha outra categoria.</p></section>}
    <section className="grid gap-6 lg:grid-cols-[1fr_18rem]"><div><h2 className="text-lg font-semibold">Perguntas frequentes</h2><Accordion type="single" collapsible className="mt-2">{FAQ.map(([question, answer], index) => <AccordionItem value={`faq-${index}`} key={question}><AccordionTrigger>{question}</AccordionTrigger><AccordionContent className="text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion></div><aside className="surface h-fit p-5"><HelpCircle className="size-6 text-primary" /><h2 className="mt-3 font-semibold">Ainda precisa de ajuda?</h2><p className="mt-1 text-sm text-muted-foreground">No momento, consulte os tutoriais e as perguntas frequentes. Os canais de atendimento aparecerão aqui quando forem configurados.</p><Button variant="outline" className="mt-4 w-full" disabled>Solicitar ajuda</Button></aside></section>
  </div>;
}