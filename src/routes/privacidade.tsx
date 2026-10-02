import { createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand/BrandLogo";
export const Route = createFileRoute("/privacidade")({ head: () => ({ meta: [
  { title: "Privacidade e proteção de dados — TeraClini" },
  { name: "description", content: "Saiba como o TeraClini protege dados profissionais e pré-cadastros de pacientes." },
  { property: "og:title", content: "Privacidade e proteção de dados — TeraClini" },
  { property: "og:description", content: "Saiba como o TeraClini protege dados profissionais e pré-cadastros de pacientes." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
] }), component: Privacy });
function Privacy() { return <main className="min-h-screen bg-background px-4 py-10"><article className="surface mx-auto max-w-3xl p-6 sm:p-10"><BrandLogo className="w-44" /><h1 className="mt-8 text-3xl font-semibold">Privacidade e proteção de dados</h1><div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground"><p>A TeraClini oferece infraestrutura para que profissionais independentes organizem sua prática. O profissional que enviou o link é responsável pela finalidade do pré-cadastro e pela relação de atendimento.</p><p>Os dados enviados no pré-cadastro ficam restritos ao espaço profissional associado ao link e só entram no cadastro oficial após revisão e aprovação explícita.</p><p>Não criamos uma conta para o paciente, não fazemos diagnóstico automático e não usamos respostas clínicas em listas gerais, endereços ou mensagens técnicas.</p><p>Para exercer direitos de acesso, correção ou eliminação, procure diretamente o profissional que forneceu o link.</p></div></article></main>; }
