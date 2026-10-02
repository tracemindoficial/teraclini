import { useState } from "react";
import { BarChart3, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminHelp,
  useSaveAdminHelpCategory,
  useSaveAdminHelpTutorial,
  useToggleAdminHelpTutorial,
} from "@/lib/data/help-admin";

type TutorialForm = {
  id?: string;
  categoryId: string;
  title: string;
  slug: string;
  shortDescription: string;
  objective: string;
  content: string;
  expectedResult: string;
  keywords: string;
  routePath: string;
  visibility: "all" | "professional" | "admin";
  orderIndex: number;
  isActive: boolean;
  mediaUrl: string;
  steps: string;
};
const empty: TutorialForm = {
  categoryId: "",
  title: "",
  slug: "",
  shortDescription: "",
  objective: "",
  content: "",
  expectedResult: "",
  keywords: "",
  routePath: "",
  visibility: "professional",
  orderIndex: 0,
  isActive: true,
  mediaUrl: "",
  steps: "",
};

export function AdminHelpPage() {
  const { data, isLoading, error } = useAdminHelp();
  const save = useSaveAdminHelpTutorial();
  const toggle = useToggleAdminHelpTutorial();
  const saveCategory = useSaveAdminHelpCategory();
  const [form, setForm] = useState<TutorialForm | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [category, setCategory] = useState({ name: "", slug: "", description: "", orderIndex: 0 });
  const views = data?.events.filter((e) => e.event_type === "view").length ?? 0;
  const completed = data?.events.filter((e) => e.event_type === "completed").length ?? 0;
  const noResults = data?.events.filter((e) => e.event_type === "no_results").length ?? 0;
  const tutorialViews = data.tutorials.map((tutorial) => ({ title: tutorial.title, count: data.events.filter((event) => event.event_type === "view" && event.tutorial_id === tutorial.id).length })).sort((a,b) => b.count-a.count).slice(0,3);
  const searchTerms = [...new Set(data.events.filter((event) => event.search_term).map((event) => event.search_term as string))].slice(0,5);
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando conteúdos...</p>;
  if (error || !data)
    return <p className="text-sm text-destructive">Não foi possível carregar a gestão da ajuda.</p>;
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Visualizações" value={views} />
        <Metric label="Conclusões" value={completed} />
        <Metric label="Buscas sem resultado" value={noResults} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2"><div className="surface p-4"><h2 className="font-semibold">Tutoriais mais vistos</h2><ol className="mt-3 space-y-2 text-sm">{tutorialViews.map((item)=><li key={item.title} className="flex justify-between gap-3"><span>{item.title}</span><strong>{item.count}</strong></li>)}</ol></div><div className="surface p-4"><h2 className="font-semibold">Termos pesquisados</h2><p className="mt-3 text-sm text-muted-foreground">{searchTerms.length ? searchTerms.join(" · ") : "Nenhuma pesquisa registrada."}</p></div></section>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setForm({ ...empty, categoryId: data.categories[0]?.id ?? "" })}>
          <Plus className="mr-2 size-4" />
          Novo tutorial
        </Button>
        <Button variant="outline" onClick={() => setCategoryOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nova categoria
        </Button>
      </div>
      <section className="surface overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3">Tutorial</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Visibilidade</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.tutorials.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">/{item.slug}</p>
                </td>
                <td className="px-4 py-3">
                  {data.categories.find((c) => c.id === item.category_id)?.name}
                </td>
                <td className="px-4 py-3">{item.visibility}</td>
                <td className="px-4 py-3">{item.is_active ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm({
                          id: item.id,
                          categoryId: item.category_id,
                          title: item.title,
                          slug: item.slug,
                          shortDescription: item.short_description,
                          objective: item.objective,
                          content: item.content,
                          expectedResult: item.expected_result,
                          keywords: item.keywords.join(", "),
                          routePath: item.route_path ?? "",
                          visibility: item.visibility,
                          orderIndex: item.order_index,
                          isActive: item.is_active,
                          mediaUrl: item.media_url ?? "",
                          steps: [...(item.help_tutorial_steps ?? [])].sort((a,b)=>a.order_index-b.order_index).map((step)=>`${step.title} | ${step.instruction}`).join("\n"),
                        })
                      }
                    >
                      <Pencil className="mr-2 size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.is_active && !window.confirm("Desativar este tutorial?")) return;
                        toggle.mutate({
                          data: { id: item.id, isActive: !item.is_active, confirm: true },
                        });
                      }}
                    >
                      {item.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-2xl">
          {form ? (
            <>
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar tutorial" : "Novo tutorial"}</DialogTitle>
                <DialogDescription>Conteúdo pesquisável da Central de Ajuda.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  aria-label="Título"
                  placeholder="Título"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <Input
                  aria-label="Slug"
                  placeholder="slug-do-tutorial"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setForm({ ...form, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.visibility}
                  onValueChange={(value: TutorialForm["visibility"]) =>
                    setForm({ ...form, visibility: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  className="sm:col-span-2"
                  aria-label="Resumo"
                  placeholder="Resumo"
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                />
                <Textarea className="min-h-28 sm:col-span-2" aria-label="Etapas" placeholder="Uma etapa por linha: Título | Instrução" value={form.steps} onChange={(e)=>setForm({...form,steps:e.target.value})}/>
                <Textarea
                  className="sm:col-span-2"
                  aria-label="Objetivo"
                  placeholder="Objetivo"
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                />
                <Textarea
                  className="sm:col-span-2"
                  aria-label="Conteúdo"
                  placeholder="Conteúdo complementar"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                <Textarea
                  className="sm:col-span-2"
                  aria-label="Resultado esperado"
                  placeholder="Resultado esperado"
                  value={form.expectedResult}
                  onChange={(e) => setForm({ ...form, expectedResult: e.target.value })}
                />
                <Input
                  placeholder="palavras, separadas, por vírgula"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                />
                <Input
                  placeholder="Caminho, ex.: /agenda"
                  value={form.routePath}
                  onChange={(e) => setForm({ ...form, routePath: e.target.value })}
                />
                <Input
                  placeholder="URL opcional de mídia"
                  value={form.mediaUrl}
                  onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  value={form.orderIndex}
                  onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button
                  disabled={save.isPending || !form.categoryId}
                  onClick={async () => {
                    await save.mutateAsync({
                      data: {
                        ...form,
                        keywords: form.keywords
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                        routePath: form.routePath || null,
                        mediaUrl: form.mediaUrl || null,
                        steps: form.steps.split("\n").map((line)=>{const [title,...instruction]=line.split("|");return {title:title?.trim()??"",instruction:instruction.join("|").trim()};}).filter((step)=>step.title && step.instruction),
                      },
                    });
                    setForm(null);
                  }}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>Organize os tutoriais por assunto.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome"
            value={category.name}
            onChange={(e) => setCategory({ ...category, name: e.target.value })}
          />
          <Input
            placeholder="slug-da-categoria"
            value={category.slug}
            onChange={(e) => setCategory({ ...category, slug: e.target.value })}
          />
          <Textarea
            placeholder="Descrição"
            value={category.description}
            onChange={(e) => setCategory({ ...category, description: e.target.value })}
          />
          <Input
            type="number"
            min={0}
            value={category.orderIndex}
            onChange={(e) => setCategory({ ...category, orderIndex: Number(e.target.value) })}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={saveCategory.isPending}
              onClick={async () => {
                await saveCategory.mutateAsync({
                  data: { ...category, description: category.description || null, isActive: true },
                });
                setCategoryOpen(false);
                setCategory({ name: "", slug: "", description: "", orderIndex: 0 });
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="surface p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BarChart3 className="size-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
