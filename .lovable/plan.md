# Unificação do financeiro profissional do TeraClini

## Etapa atual: auditoria concluída, implementação aguardando autorização

Foram inspecionados os formulários, consultas, regras puras, migrações e o esquema efetivamente instalado no banco. Nenhum paciente, atendimento, pacote ou pagamento foi criado, alterado ou removido. Abaixo, “existe” significa confirmado no código/banco; não significa que todos os fluxos já foram testados ponta a ponta.

## 1. Cadastro de serviços atual

- `appointment_types` já é o cadastro de serviços por conta: ID, nome, descrição, categoria, duração padrão, cor e ativo/inativo.
- Cadastros Básicos permite manter serviços; agenda e pacotes usam seus IDs.
- **Reutilizar integralmente**, sem outro cadastro de serviços.

## 2. Cadastro de valores atual

- `service_prices` já relaciona serviço, preço em centavos, duração, modalidade, avulso/pacote, quantidade e situação.
- `save_service_price` cria uma nova versão para alterações econômicas e desativa a anterior; `parent_price_id` preserva o vínculo.
- A agenda oferece preços avulsos compatíveis e preenche a duração quando o profissional escolhe um preço. **Não há seleção automática inequívoca implementada.**
- Preços e serviços estão isolados por conta. Fotografias dos valores contratados não são cadastros duplicados: são necessárias para preservar o histórico.

## 3. Pacotes atuais

- `care_packages` já guarda paciente, conta, profissional, serviço, preço de origem, quantidade, período, periodicidade, alerta, situação, valor total e valor por sessão.
- Renovação cria um novo pacote com `parent_package_id`; eventos ficam em `care_package_events`.
- Quantidade personalizada existe. Periodicidade hoje é informação do pacote: **não gera datas nem agendamentos**.
- Há campos legados decimais e campos novos em centavos. O formulário ainda envia valores decimais; esse caminho precisa ser unificado em centavos sem apagar os campos antigos.
- **Limitação confirmada no banco:** ao criar um pacote com preço vinculado, o trigger copia quantidade e total da oferta, substituindo os valores enviados. Hoje isso impede combinar livremente uma oferta com outra quantidade/desconto negociado.

## 4. Agendamentos atuais

- `appointments` já vincula paciente, profissional/conta, serviço, local, sala, modalidade, preço e pacote.
- Preserva nome, duração e preço aplicados em campos de fotografia histórica.
- O formulário cria **um atendimento por envio** e permite vinculá-lo a um pacote existente. Não existe o fluxo “criar pacote + gerar N sessões”.
- Datas, fuso, disponibilidade, bloqueios, conflitos e alterações parciais já têm estrutura reutilizável. O novo fluxo deve usar essas mesmas validações, nunca uma segunda agenda.

## 5. Sessões e consumo

- A sessão é o próprio atendimento; não é necessário criar uma tabela paralela de sessões.
- `packageUsage` conta somente `status = realizado`. Agendados, cancelados e faltas não consomem.
- O banco valida pacote/paciente/conta e impede transferir/remover uma sessão realizada de seu pacote.
- O limite de consumo é verificado por contagem; a conclusão concorrente de duas sessões precisa de teste e proteção transacional para não ultrapassar a quantidade.

## 6. Estrutura financeira existente

- `payments`, `payment_events` e `account_subscriptions` pertencem às **assinaturas do TeraClini**, não aos recebimentos dos pacientes. `payments.subscription_id` é obrigatório.
- Essas tabelas não têm políticas de acesso direto para profissionais. Não serão reaproveitadas para dinheiro recebido de pacientes.
- Não foi encontrada uma estrutura de contas a receber/recebimentos profissionais no esquema público nem uma tela Financeiro profissional.
- Relatórios profissionais atuais mostram atividade, pacientes e pendências clínicas, não pagamentos. Valores de pacotes/sessões representam contratação, não comprovação de dinheiro recebido.

## 7. O que será unificado e reutilizado

- Serviços, preços versionados, pacotes, agenda, pacientes, identidade/conta e históricos atuais.
- Conversão/exibição de reais e cálculos em centavos, com uma única regra para valores novos e compatibilidade com os antigos.
- Formulário de agendamento com opções **Avulso** e **Pacote de sessões**; no segundo, criação ou seleção do pacote e revisão de todas as datas antes de salvar.
- Detalhe do pacote, atendimento e ficha do paciente passam a consultar o mesmo saldo financeiro, sem campos independentes de “pago”.

## 8. O que precisa ser criado — somente o necessário

### Agendamento completo de pacote

- Quantidade inteira positiva, duração/modalidade da oferta, frequência semanal/quinzenal ou datas manuais, local quando aplicável, valor de referência, desconto e total contratado.
- Profissional responsável derivado da sessão autenticada; não introduzir equipe ou gestão de clínica.
- Mostrar previsão das N sessões e conflitos. Confirmar tudo em **uma transação**: se uma data falhar, nenhum novo pacote, sessão ou título financeiro parcial será salvo.
- Chave de idempotência impede duplicação por clique repetido/reenvio.
- Preservar criação de pacotes sem agendamento completo e permitir planejar sessões restantes de pacotes existentes, sem recriar as já vinculadas.

### Financeiro manual

Três estruturas novas, exclusivamente financeiras e vinculadas aos IDs existentes:

1. **Títulos a receber (`professional_receivables`)**: compromisso contratado, paciente, conta, serviço/fotografia, valor em centavos, vencimento e origem avulsa/pacote/sessão de pacote. Unicidade da origem impede cobranças duplicadas.
2. **Recebimentos (`professional_receipts`)**: cada pagamento parcial ou total, ligado ao título; valor, data, forma, observação financeira, confirmação e estorno/cancelamento. Um recebimento pendente não aumenta o total recebido.
3. **Eventos financeiros (`professional_financial_events`)**: histórico imutável de criação, confirmação, correção, cancelamento e estorno, com ator, horário e valores relevantes, sem conteúdo clínico ou cópia de observações livres.

**Parcial/Pago/Pendente são situações derivadas do título e dos recebimentos confirmados**, não de uma sessão realizada. Cancelamento do título e estorno do recebimento são ações diferentes.

### Telas

- Financeiro: Resumo, Recebimentos, Pendentes, Pacotes e Relatórios, com páginas próprias e navegação compartilhada.
- Filtros por período, paciente, serviço, modalidade, pacote, forma e situação; listas paginadas, totais calculados no banco e exportação simples CSV.
- Registrar/confirmar, corrigir e estornar recebimento com histórico e confirmação explícita; nenhuma exclusão física.
- PIX, cartão, dinheiro, transferência e outro são **formas registradas manualmente**, sem integração bancária ou cobrança recorrente.

## 9. Riscos e proteções

- **Cobrar pacote e suas sessões duas vezes:** modelo financeiro mutuamente exclusivo por pacote, unicidade da origem e operações idempotentes.
- **Perder centavos no rateio:** repartir o total com distribuição determinística do resto; a soma das parcelas precisa ser exatamente igual ao contratado.
- **Mudar quantidade/desconto silenciosamente:** ajustar o trigger de fotografia para distinguir oferta de origem de contratação efetiva; mostrar e gravar o mesmo total revisado pelo profissional.
- **Alterar história:** não recalcular pacotes/atendimentos antigos quando o catálogo mudar; renegociação futura exige evento e proteção contra redução abaixo do recebido.
- **Parcialmente criar N agendamentos:** transação única e validação no banco, incluindo revalidação de conflitos na confirmação.
- **Confundir cancelamento clínico e financeiro:** cancelar sessão não estorna automaticamente dinheiro nem consome pacote; cancelamento financeiro exige ação explícita e histórico.
- **Apagar conta com dinheiro registrado:** integrar as três tabelas às contagens reais, bloqueios de escrita e impedimentos de exclusão administrativa.
- **Acesso indevido:** RLS, permissões explícitas, referências na mesma conta e validação transacional. Proposta: titular e papel financeiro operam dinheiro; assistente não recebe essa permissão por padrão. Administrador da plataforma não ganha acesso automático ao financeiro dos pacientes.
- **Leitura excessiva:** resumo agregado, busca limitada e paginação no banco, índices por conta/data/situação/origem e invalidação localizada. Sem carregar todos os pacientes/sessões ao entrar.
- O banco atual tem concessões de tabela amplas inclusive para `anon`, mas as políticas consultadas restringem serviços/preços/pacotes/agenda a membros autenticados; `payments` permanece sem políticas diretas. Revisar privilégios efetivos na implementação, sem confundir GRANT com autorização por RLS.

## 10. Arquitetura final proposta

```text
Conta profissional → Paciente
                         ↓
                 Serviço → Preço versionado
                         ↓
             ┌───────────┴────────────┐
             ↓                        ↓
       Atendimento avulso         care_packages
             ↓                        ↓
       1 appointments          N appointments
             ↓                        ↓
       1 título avulso         Modelo exclusivo:
                               pré-pago → 1 título do pacote
                               por sessão → N títulos rateados
             └───────────┬────────────┘
                         ↓
               Recebimentos individuais
                         ↓
           Saldo derivado + eventos imutáveis
                         ↓
             Resumo, pendentes e relatórios
```

- **Pré-pago:** um título do pacote; pagamentos parciais/antecipados liquidam esse título. As sessões não criam cobrança adicional.
- **Por sessão:** títulos rateados vinculados às sessões, sem título adicional do total. O total do pacote é a soma dos títulos, não uma segunda cobrança. Reagendar preserva o título; cancelar sessão exige decisão financeira explícita.
- Pacote sem valor definido continua “A definir”, não vira zero nem cria uma dívida inventada. Importação de contratos existentes será uma ação explícita, com revisão, nunca presumindo que houve pagamento.
- Exemplo obrigatório: R$720 contratado e R$300 confirmado → recebido R$300, saldo R$420, parcial. R$720 confirmado → saldo zero, pago.

### Detalhes técnicos da implementação futura

- Migrações aditivas, GRANT → RLS → políticas, referências restritivas e funções transacionais com autorização por conta; sem alteração destrutiva ou DELETE em massa.
- Operações internas pelo mecanismo autenticado existente; autorização de papéis no servidor/banco, não em armazenamento do navegador.
- Componentes reutilizáveis fora das rotas, consultas por domínio, cálculos puros e testes de regressão; nenhuma alteração dos módulos administrativos de assinatura.
- Não reutilizar métricas administrativas de assinatura como regras de recebimentos de pacientes.

## Validação realmente realizada nesta auditoria

- Página inicial respondeu HTTP 200, carregou o TeraClini e não apresentou erros de navegador nem carregou os módulos antigos mencionados na mensagem.
- **26 testes passaram**: 4 de cadastros/valores, 6 de pacotes e 16 de agenda.
- Conferidos esquema instalado, funções de preços/fotografias/consumo, políticas e privilégios de tabela. Prévia com build OK.
- Não foram realizados novos testes autenticados com mutações: esta etapa é auditoria, não implantação. Isolamento ponta a ponta, pagamentos e geração de lotes não estão declarados aprovados.

## Etapas após autorização

1. Ajustar contrato de pacote em centavos e criar agendamento transacional completo.
2. Criar títulos/recebimentos/eventos, permissões, unicidade e operações auditadas.
3. Integrar Financeiro, agenda, pacote, paciente e relatórios, com consultas limitadas.
4. Executar os 13 cenários solicitados com dados descartáveis, incluindo pacotes de 4/8, consumo apenas realizado, pagamento total/parcial/pendente, confirmação no banco, relatórios, histórico e isolamento entre duas contas; testar também concorrência, reenvio, estorno e telas de computador/celular.
5. Entregar matriz do que passou e pendências reais; preservar todos os dados existentes.

**Nenhuma implementação funcional ou alteração do banco será feita antes da aprovação deste plano.**