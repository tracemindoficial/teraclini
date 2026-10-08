# Auditoria de performance e arquitetura — TeraClini

Data: 08/10/2026. Escopo: inspeção, medições e proposta; nenhuma otimização funcional implementada.

## 1. RESUMO EXECUTIVO

O sistema está organizado por rotas TanStack Start, componentes, hooks de domínio, funções de servidor e banco com RLS. A prática profissional e a administração da plataforma possuem layouts e autorização separados. Não há justificativa evidenciada para reescrever o produto ou trocar suas entidades.

Os achados mais concretos são imagens grandes na página publicada, repetição de consultas de acesso/perfil e hooks de diálogos executados mesmo fechados. Listagens sem paginação, agregações administrativas e financeiras e um índice duplicado representam riscos de crescimento; não foram comprovados como gargalos atuais de produção.

O banco estava saudável no momento da leitura. A prévia profissional abriu os módulos observados sem erros de página. A administração não pôde ser medida funcionalmente porque a sessão utilizada não possui esse papel. Não foi alterado código funcional, esquema ou conteúdo clínico/financeiro. A própria navegação pode gerar eventos operacionais de uso previstos pela aplicação; portanto, não se afirma ausência absoluta de escritas automáticas.

**Classificação de evidências:** medido = observação pontual; confirmado no código/catálogo = estrutura existente; hipótese = efeito ainda não demonstrado. Os números não são percentis, SLA ou teste de carga.

## 2. PROBLEMAS DE PERFORMANCE

| Problema | Impacto | Causa | Risco | Solução |
| -------- | ------- | ----- | ----- | ------- |
| Imagens públicas grandes — medido | Aproximadamente 2,70 MB em três imagens; mais bytes que o JS observado | PNGs de marca/experiência de 1,47 MB e 1,05 MB, mockup de 178 KB | Alto em redes limitadas; visual precisa ser preservado | Variantes otimizadas, dimensões responsivas e carregamento adequado, sem substituir a identidade |
| Leituras repetidas de acesso/perfil — código e rede | Chamadas adicionais na entrada de módulos | Guard chama `getUser`, `getSessionAccess` e onboarding; shell repete acesso e perfil | Médio; otimização incorreta pode comprometer bloqueio de contas | Compartilhar contexto mínimo autorizado, mantendo verificação no servidor e invalidação segura |
| Diálogos fechados consultam dados — confirmado | Agenda/Meu Dia carregam catálogos e listas sem abrir formulário | `AppointmentDialog` executa hooks antes de considerar `open` | Médio; não basta ocultar conteúdo do diálogo | Habilitar consultas quando necessárias, preservando pré-seleções e retomada |
| Listas profissionais sem paginação — confirmado | Payload e memória crescem por conta | Pacientes, pacotes e relacionamentos, documentos e históricos sem limites em alguns hooks | Médio/alto no crescimento | Busca/paginação no banco e projeções específicas; não truncar silenciosamente seletores/históricos |
| Agregações administrativas/financeiras — hipótese de escala | Contagens e totais podem dominar tempo com volume | Diretório materializado, joins e totais por conta | Médio; atual banco pequeno não demonstra lentidão | Medir planos com volume representativo antes de alterar RPCs |
| Índice duplicado de uso — catálogo | Armazenamento e manutenção extra em escrita | Dois índices idênticos `(account_id, occurred_at DESC)` | Baixo; ganho atual não quantificado | Avaliar remoção de um por migração separada e aprovada |
| Cache/invalidação amplos — confirmado | Refetch de listas e intervalos não afetados | Invalidação de famílias completas; login/atualização invalida consultas | Médio; risco de dados desatualizados se estreitar incorretamente | Mapear dependências por domínio, conta e filtros antes de reduzir invalidações |

Não houve profiling React que quantifique rerenders, CPU ou memória do navegador. Tamanho de arquivo e quantidade de hooks, isoladamente, não demonstram lentidão de renderização.

## 3. CÓDIGO DUPLICADO

| Estrutura | Duplicidade | Onde aparece | Recomendação |
| --------- | ----------- | ------------ | ------------ |
| Acesso e onboarding | Perfil/onboarding consultados no fluxo de autorização e novamente no layout | `src/lib/access.functions.ts`, guards, `AppShell.tsx`, hooks de perfil | Reutilizar projeção mínima autorizada; não eliminar guard de servidor |
| Importação do cliente administrativo | Importação dinâmica repetida em funções de servidor | Arquivos `*.functions.ts` | Pequena padronização possível; preservar isolamento do cliente privilegiado |
| Imports de dados | Barrel e import direto coexistem | `src/lib/data.ts` e consumidores de `src/lib/data/*` | Preferir fronteiras de domínio em novas alterações; não justificar refatoração total |
| Índices de telemetria | Mesma definição física | `usage_events_account_occurred_idx`, `admin_usage_account_time_idx` | Analisar e manter apenas um após aprovação |

Não foram identificadas duas rotas significativas para a mesma URL nem dois providers de React Query. Guards profissional e administrativo são ramos distintos, não uma dupla autorização executada na mesma navegação.

## 4. CÓDIGO MORTO

| Arquivo | Tipo | Evidência | Seguro remover? |
| ------- | ---- | --------- | --------------- |
| `src/components/ui/sidebar.tsx` | Scaffold UI | Sem imports encontrados no código auditado; shell real é `AppShell` | Candidato; confirmar geração e referências antes de remover |
| `ui/carousel.tsx`, `menubar.tsx`, `context-menu.tsx`, `navigation-menu.tsx` | Scaffold UI | Sem consumidores encontrados | Candidato condicionado à validação |
| `ui/form.tsx`, `calendar.tsx`, `command.tsx`, `table.tsx`, `dropdown-menu.tsx` | Scaffold UI | Sem consumidores encontrados; `form-field.tsx` é estrutura diferente em uso | Candidato, sem exclusão nesta auditoria |

São mais de 2.290 linhas nos componentes acima. Ausência de imports não prova ausência em todos os mecanismos de geração. Código não importado normalmente não integra o bundle final; limpeza melhora manutenção, mas não é apresentada como ganho comprovado de carregamento. Não houve exclusão de arquivos.

## 5. DEPENDÊNCIAS

| Dependência | Uso | Peso | Recomendação |
| ----------- | --- | ---- | ------------ |
| React, TanStack Start/Router/Query, Supabase | Base do produto | Não isolado por biblioteca | Manter; não trocar stack sem motivo funcional |
| FullCalendar e Luxon | Agenda interativa e timezone | Não isolado em produção autenticada | Manter lazy de `AgendaCalendar` já existente |
| Recharts | Gráficos | Não isolado | Avaliar carregamento nas rotas que usam gráficos após baseline autenticada |
| React Hook Form, Zod | Formulários e validação compartilhada | Não isolado | Preservar modelos e validações |
| cmdk, embla-carousel-react, input-otp, react-day-picker, vaul | Referências associadas a scaffolds sem consumidores encontrados | Ganho real não medido | Só remover após eliminar consumidores e executar regressão |
| Radix UI, lucide-react, Tailwind | Design system | Sem atribuição individual | Preservar acessibilidade e identidade; auditar imports na alteração específica |

Inventário: 82 entradas de dependências e ferramentas no `package.json`. Não se declarou pacote totalmente sem referências apenas porque não aparece em telas. O JS público observado somou 260.317 bytes codificados em 44 recursos `.js`, incluindo scripts da plataforma; isso não mede o pacote inteiro nem a contribuição isolada de cada biblioteca.

## 6. ROTAS

Inventário: 50 arquivos de rotas, incluindo root, layouts e composição. Mapa funcional:

```text
Público
  /, /planos, /auth, /reset-password, /conta-indisponivel
  /pre-cadastro/$token, /privacidade, /termos
Profissional — layout _authenticated
  /onboarding, /meu-dia, /agenda
  /pacientes, /pacientes/$id
  /pacientes/pre-cadastros, /pacientes/pre-cadastros/$id
  /atendimentos/$id, /pacotes, /pacotes/$id, /financeiro
  /locais, /documentos, /relatorios
  /configuracoes, /configuracoes/cadastros-basicos
  /ajuda, /ajuda/tutorial, /suporte
Plataforma — layout _admin
  /admin e páginas operacionais de clientes, assinaturas,
  auditorias, configurações, métricas, notificações, pagamentos,
  perfil, relatórios, suporte, uso, vencimentos e ajuda
  /admin/usuarios, /admin/usuarios/$id
```

Os nomes internos `usuarios` foram preservados para compatibilidade; a UI chama essas contas profissionais de Clientes. Não há evidência de conflito significativo de URLs. Rotas de composição usam Outlet; layouts sem tela não precisam de título próprio. O roteamento possui divisão automática e a agenda separa explicitamente o calendário com `lazy` e `ClientOnly`.

O título e metadados raiz são compartilhados; novas rotas públicas devem declarar metadados próprios quando necessário. Não se recomenda reorganizar URLs ou gerar manualmente a árvore de rotas.

## 7. BANCO

**Inventário vivo, somente leitura:** 51 tabelas base públicas, todas com RLS habilitada; 47 policies, 164 índices, 64 funções e 110 triggers públicos não internos. Tamanho aproximado das relações públicas: 3,45 MB; tamanho global informado pelo monitor: 16,2 MB. São medidas diferentes. Estimativas de linhas do catálogo são pequenas/incompletas e não substituem contagens exatas.

**Saúde pontual:** banco/PgBouncer disponíveis, sem reinícios; memória 62%, disco 15%, 10/60 conexões e pool 1/200. Não se observou exaustão naquele instante. Contadores acumulados de rollback não foram usados como taxa de falhas ou evidência de sobrecarga.

**Snapshot de consultas, janela/reset desconhecidos:**

| Operação | Chamadas | Média | Máximo |
| --- | ---: | ---: | ---: |
| SELECT onboarding_tasks | 167 | 7,06 ms | 41,75 ms |
| INSERT usage_events | 186 | 4,86 ms | 38,45 ms |
| SELECT locations | 233 | 3,35 ms | 34,10 ms |
| INSERT commercial_conversion_events | 99 | 6,75 ms | 24,29 ms |
| SELECT patient_registration_requests | 227 | 2,87 ms | 32,42 ms |
| SELECT patient_registration_links | 147 | 3,24 ms | 35,47 ms |

Essas médias são agregadas das estatísticas, não tempos totais HTTP nem amostra atual de uma conta. Não demonstram consulta cronicamente pesada. Nenhum teste de carga ou EXPLAIN com volume representativo foi executado.

**Consultas e índices:** agenda limita intervalo e possui índices por conta/início e constraints GiST de conflitos; pacientes têm índices de conta, CPF normalizado, e-mail e identidade; documentos possuem índices por conta e paciente; pré-cadastros possuem conta/status/data. Não se comprovou índice ausente que explique lentidão atual. Busca parcial textual e combinações de filtros podem requerer índices específicos futuramente, sujeitos a planos reais. A duplicidade em `usage_events` foi confirmada no catálogo.

Pacientes e alguns históricos/documentos são carregados sem paginação. Pacotes incluem atendimentos relacionados. Pendências de evolução usam duas consultas sequenciais com um IN em lote, não uma consulta por paciente. Detalhe administrativo reúne dez consultas paralelas, incluindo quatro contagens exatas. Diretório administrativo usa CTE, joins e contagem total; financeiro pagina no banco (limite máximo 100), mas calcula agregados por conta. São candidatos a medição com crescimento, não justificativa para reescrever agora.

**RLS/RPCs:** pacientes e atendimentos usam membership de conta; financeiro permite leitura via `can_manage_professional_finance`; perfil é próprio do usuário. RPCs financeiras e aprovação/cadastro de paciente não têm EXECUTE anônimo; RPCs de diretório/resumo administrativo não têm EXECUTE para anon nem authenticated. Permissões de tabela isoladas não equivalem a acesso efetivo: policies e triggers também se aplicam. Não se certificou integralmente cada policy ou cada função.

O trigger de conflitos retorna `trigger`: um grant EXECUTE encontrado em função de trigger, sozinho, não comprova operação remota chamável ou bypass. Triggers de exclusão pendente obtêm `FOR SHARE` na conta por escrita; essa sincronização é deliberada e não deve ser retirada para acelerar operações sem revisar concorrência e segurança. FKs de preservação e histórico não foram alteradas.

## 8. MULTI-TENANCY

O modelo preserva identidade profissional (`auth.users`), perfil, conta/membership e pacientes distintos. `is_account_member` e `has_account_role` consideram membership e conta ativos/não bloqueados. Administração opera projeções administrativas, não o prontuário.

Pontos de atenção para qualquer otimização:

- Contexto/cache de acesso não pode continuar válido após suspensão, troca de conta, logout ou mudança de papel.
- `account_id` recebido do navegador nunca substitui autorização no servidor/banco.
- Paginação e RPCs agregadas devem aplicar isolamento antes de contar e buscar.
- Cache em memória não deve atravessar usuários; `SIGNED_OUT` já limpa consultas.
- RPCs SECURITY DEFINER e cliente privilegiado exigem verificações explícitas; imports administrativos permanecem no servidor.
- Reestruturar locks, exclusão ou FKs pode quebrar preservação de dados e retomada segura.
- Busca global, logs e instrumentação não devem exportar conteúdo clínico, tokens ou IDs sensíveis em evidências públicas.

Foi observada recusa do ramo admin com a sessão profissional. Não foram executados novos testes de invasão cruzada entre duas contas, storage, suspensão/reativação ou papéis nesta auditoria. Testes históricos não foram contados como validação atual.

## 9. ARQUITETURA

**Bem estruturado:** um provider Query; schemas compartilhados; hooks separados por domínio; ações transacionais no banco; funções de servidor isoladas; shells e guards distintos; agenda lazily loaded; design system e paleta centralizados.

**Acoplamentos:** `AppShell` (429 linhas) combina navegação, consultas, telemetria, busca e ajuda; `AppointmentDialog` mistura formulário e vários catálogos; barrel `src/lib/data.ts` reexporta 13 domínios; páginas administrativas e funções de operações são grandes. O tamanho indica custo de manutenção, não defeito de execução por si só.

**Crescimento:** preferir imports diretos por domínio, contratos explícitos de queries e ações, paginação compartilhada e componentes de apresentação menores apenas quando a alteração real justificar. Não criar um contexto global de todos os pacientes/atendimentos. Não duplicar fontes de saldo, sessões ou autorização.

CSS: tokens de marca e tema centralizados; estilos específicos do calendário em `src/styles.css`; Tailwind e classes locais predominam. Não houve medição de CSS não utilizado em toda a aplicação ou profiling de layout. CSS público codificado observado: 17.201 bytes. Evitar limpeza baseada apenas na ausência de uma classe numa tela.

## 10. NOVOS MÓDULOS

Preparar gradualmente fronteiras de domínio, não reconstruir a plataforma. Cada módulo deve declarar rotas, tipos, query keys, regras de invalidação, permissões, schema e testes. Reutilizar paciente, atendimento, local, tipo/preço e pacote existentes.

Relatórios, documentos, avaliações e futuras integrações devem usar projeções/paginação, isolamento e anexos privados. IA assistiva não pode introduzir diagnósticos automáticos ou enviar conteúdo clínico sem base e autorização adequadas. Cobrança automática/PIX e novos módulos não fazem parte desta entrega. Assinatura do SaaS continua separada do financeiro profissional.

## 11. PERFORMANCE

```text
ANTES — página pública publicada https://teraclini.lovable.app
tempo inicial: cold TTFB 1.307 ms; DOMContentLoaded 1.677 ms; load 2.048 ms
               warm TTFB 172 ms; DOMContentLoaded 280 ms; load 282 ms
requests: 54 cold / 55 warm observados
bundle: 44 recursos JS; 260.317 bytes codificados somados
        não é tamanho integral do build nem bundle autenticado
principais gargalos: imagens públicas grandes; acesso/perfil repetidos e
                    consultas antecipadas confirmados no código profissional
DEPOIS: não existe — nenhuma otimização foi implementada
```

Amostras públicas únicas por condição em Chromium desktop, sem throttling. O intervalo até idle foi 3.920/1.921 ms e inclui espera fixa adicional de 500 ms. Resources transferidos frios de JS: 273.517 bytes; warm: 15.414 bytes, refletindo cache. Diferenças de cache/CDN/rede impedem extrapolação para usuários.

**Prévia local de desenvolvimento — hard reload, DOMContentLoaded até idle:**

| Rota | Intervalo observado | Requests da navegação | REST / auth / serverFn |
| --- | ---: | ---: | --- |
| / | 4.951 ms cold; 2.334 ms warm | 203 cold | Ambiente Vite |
| /auth | 1.499 ms | 192 | Ambiente Vite |
| /meu-dia | 5.233 ms | 269 | 13 / 2 / 5 |
| /pacientes | 4.344 ms | 249 | 3 / 2 / 5 |
| /agenda | 3.235 ms | 277 | 11 / 2 / 5 |
| /pacientes/pre-cadastros | 3.466 ms | 245 | 4 / 2 / 5 |
| /financeiro | 3.823 ms | 254 | 8 / 2 / 5 |
| /pacotes | 3.770 ms | 254 | 6 / 2 / 5 |
| /configuracoes/cadastros-basicos | 3.638 ms | 251 | 5 / 2 / 5 |
| /admin | 2.696 ms | 211 | Autorização recusada; não mede dashboard |

Muitos requests são módulos servidos por Vite, não chunks de produção. Totais de resource timing do primeiro script não foram usados para tamanho de bundle porque o buffer não foi limpo entre navegações. Não comparar essa tabela diretamente ao DOM/load publicado.

**Navegação pelo menu local, após aguardar estabilização:** pacientes 12 requests, agenda 27, pré-cadastros 24, financeiro 24, pacotes 19, Meu Dia 20. Foram observadas duas chamadas auth e cinco/seis serverFn por módulo. Os intervalos de 1.872–2.082 ms incluem esperas fixas de 1.800 ms; portanto não são latência real de renderização. Parte dos requests pode ser prefetch ou conclusão de chamadas anteriores. Um primeiro script com espera curta capturou apenas 3–5 chamadas e foi descartado por subcontagem.

**Validação e limites:** 69 testes em nove arquivos Vitest passaram; isso cobre a suíte existente, não CRUD completo em todas as telas. Build automático reportou OK; nenhum build manual foi iniciado. Navegação profissional e telas públicas observadas não apresentaram page errors. Os logs também contêm aborts de requisições; sem correlação com uma falha de tela, não foram tratados como causa de problema funcional. Mobile, acessibilidade completa, Core Web Vitals, CPU, memória, testes de carga, administração autorizada e todos os fluxos CRUD permanecem não validados nesta auditoria.

Evidências temporárias: `/tmp/browser/teraclini-audit/measurements.json`, `client_measurements.json`, `public_production.json`, `source-inventory.json` e screenshots da mesma pasta. Não contêm exportação deliberada de conteúdo clínico ou credenciais; a sessão foi utilizada apenas na origem local.

## 12. PLANO DE OTIMIZAÇÃO

O lote de prioridade 1 foi autorizado e implementado; as prioridades seguintes aguardam nova autorização. Não há promessa de ganho percentual.

### PRIORIDADE 1 — ALTO IMPACTO / BAIXO RISCO

1. Otimizar cópias das imagens públicas preservando originais, marca, transparência quando necessária e qualidade; medir bytes/tempo cold e warm, desktop e mobile.
2. Adiar consultas de diálogos fechados; garantir dados completos ao abrir, pré-seleções e campos dependentes. Comparar requests com os mesmos módulos e cache.

### PRIORIDADE 2 — ALTO IMPACTO / MÉDIO RISCO

1. Consolidar leitura mínima de acesso/perfil no ciclo de navegação; manter autorização do servidor e testes de bloqueio, papéis, logout, retomada e troca de conta.
2. Paginação/busca de pacientes, pacotes, documentos e históricos no banco, com seletores separados e sem perda de dados ou funcionalidades.
3. Medir planos das RPCs administrativas/financeiras com volume representativo antes de otimizar agregações ou introduzir índices.

### PRIORIDADE 3 — MÉDIO IMPACTO / BAIXO RISCO

1. Remover apenas scaffolds comprovadamente sem uso e dependências que ficarem sem consumidores; executar regressão e comparar bundle. Ganho de manutenção esperado; ganho de transferência não garantido.
2. Revisar índice duplicado de telemetria por migração isolada, sem tocar nos dados.
3. Refinar query keys/invalidação e imports por domínio quando comprovados refetches dispensáveis.

### PRIORIDADE 4 — REESTRUTURAÇÃO FUTURA

1. Extrair responsabilidades do shell e formulários grandes de forma incremental.
2. Padronizar contratos paginados, instrumentação sem conteúdo sensível e fronteiras para módulos futuros.
3. Criar baseline autenticada publicada, mobile, percentis e testes de carga antes de decisões estruturais.

**Critério de conclusão por lote:** inspecionar → reproduzir → alterar apenas o lote autorizado → testes automatizados e fluxos afetados → isolamento/segurança quando aplicável → mesma medição antes/depois → atualizar roadmap com evidência e limitações. Preservar dados reais e todos os históricos. A auditoria não declara cumprida a bateria inteira de regressão solicitada; ela exige execução dedicada durante os lotes aprovados.

### Validação posterior — lote de prioridade 1

- Cópias WebP responsivas aplicadas ao logo e às imagens públicas, mantendo os originais. Arquivos gerados: logo 480/960 (35.614/98.198 bytes), dashboard (19.588 bytes) e experiência 640/1280 (54.060/137.602 bytes). Tamanho de arquivo não equivale a ganho medido de latência em produção.
- Consultas dos diálogos de agendamento, disponibilidade, bloqueio e pacote condicionadas à abertura; sala, preço e pacote do agendamento dependem das seleções correspondentes. Consumidores existentes continuam habilitados por padrão.
- 81 testes em dez arquivos passaram, incluindo 12 testes de consultas desabilitadas, abertura, invalidação e reabertura. Build automático reportou OK após correção da tipagem do teste.
- Playwright verificou apresentação pública, abertura/reabertura dos diálogos, requisições dependentes de paciente/local/serviço e paciente pré-selecionado pelo detalhe. Nenhum formulário foi salvo e nenhum erro de página foi observado.
- A apresentação móvel foi inspecionada em viewport reduzido; isso não certifica paridade funcional completa, acessibilidade ou CRUD integral.
- Não foram alterados banco, autorização, dados reais, regras financeiras ou conflitos; não houve nova medição publicada, teste de carga ou certificação integral de isolamento neste lote.