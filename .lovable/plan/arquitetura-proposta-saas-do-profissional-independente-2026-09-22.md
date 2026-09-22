# Arquitetura proposta — SaaS do profissional independente

## Objetivo validado

Evoluir o sistema existente para uma central de operação da prática individual: uma conta pertencente ao profissional, múltiplos locais e salas, agenda unificada, prontuário central, pacotes, recebimentos e relatórios.

O produto não será um sistema de administração de clínica. Locais e salas são recursos da agenda do profissional, sem sublocação, aluguel, repasses ou gestão de outros profissionais.

## Diagnóstico do sistema atual

### Base que será preservada

- Autenticação por e-mail e Google, recuperação de sessão e primeiro acesso.
- Perfil profissional individual e onboarding mínimo.
- Pacientes e responsáveis.
- Locais de atendimento ativos/inativos.
- Agenda com dia, semana e mês; horários armazenados por início e fim.
- Agendamentos, anamnese, evolução, documentos privados e busca global.
- Prontuário básico dentro do paciente.
- Isolamento atual por usuário no banco, proteção dos arquivos por pasta privada e validação de referências entre contas.
- Navegação adaptada para desktop e celular.

### Lacunas confirmadas

- O tenant ainda é tecnicamente o próprio usuário; isso não suporta acesso delegado futuro sem migração.
- Não existem salas, disponibilidade, bloqueios, pacotes, consumo de sessões, recebimentos, consentimentos, versões clínicas ou assinatura profissional.
- Agendamento e atendimento realizado ainda estão representados pela mesma entidade.
- Evolução não tem ciclo próprio completo: não iniciada, em andamento e concluída.
- O conflito atual protege o profissional e o paciente, mas precisa de garantia atômica e regras para sala, disponibilidade e bloqueio.
- O log existente é mínimo e não registra automaticamente as alterações importantes.
- Validação de tamanho/tipo de arquivo depende parcialmente da interface.
- Relatórios atuais são apenas um resumo mensal.
- A camada de dados está concentrada em um único arquivo e o prontuário em uma tela grande; ambos devem ser separados por domínio antes da ampliação.

## Decisões arquiteturais aprovadas

1. **Conta profissional extensível:** a conta pertence ao profissional. No MVP há um único proprietário; futuramente poderá haver acessos delegados com permissões, sem transformar a conta em clínica.
2. **Onboarding mínimo + checklist:** nome e profissão liberam o sistema. Local, sala, disponibilidade, primeiro paciente e primeiro atendimento ficam em uma lista retomável no Meu Dia.
3. **Financeiro simples:** recebimentos, vencimento, pagamento, desconto, forma de pagamento e relatórios básicos; sem contabilidade, contas bancárias, folha ou faturamento de clínica.
4. **Documentos clínicos preparados:** assinatura e modelos terão armazenamento/versionamento seguro, mas a geração avançada ficará para fase posterior.
5. **Nome provisório:** manter “Projeto Prática” até definição comercial.

## Arquitetura multi-tenant

```text
Conta profissional (tenant)
├── Perfil profissional
├── Membros e permissões (somente proprietário no MVP)
├── Pacientes
│   ├── Responsáveis e contatos
│   ├── Anamneses e versões
│   ├── Atendimentos realizados
│   │   └── Evoluções e versões
│   ├── Documentos e consentimentos
│   ├── Pacotes e consumos
│   └── Recebimentos
├── Locais
│   └── Salas
├── Disponibilidade e bloqueios
├── Agendamentos e histórico de status
└── Auditoria, plano e uso de armazenamento
```

- Criar `accounts` como tenant e `account_members` para vínculo de acesso. Um `account` terá exatamente um proprietário no MVP.
- Manter papéis em tabela separada, nunca no perfil. Preparar `owner`, `assistant` e `finance`, ativando apenas `owner` agora.
- Toda entidade de negócio passa a ter `account_id`; permissões consultam a associação do usuário à conta.
- Migrar dados existentes de forma aditiva: criar uma conta para cada perfil atual, preencher `account_id`, validar, só depois tornar o campo obrigatório. Não apagar nem recriar dados.
- Durante a transição, `user_id` continua disponível para compatibilidade; sua remoção só ocorrerá em migração posterior, após validação completa.
- Leituras e gravações privadas continuam protegidas no banco; esconder elementos na tela nunca será considerado autorização.
- Acesso delegado futuro será limitado por função e escopo; dados clínicos não serão liberados automaticamente a assistentes.

## Modelo de dados por domínio

### Identidade e produto

- `accounts`: conta profissional, proprietário, status e configurações gerais.
- `account_members`: usuários autorizados e estado do convite/acesso.
- `user_roles`: papel separado por conta.
- `professional_profiles`: nome profissional, CPF protegido, profissão, especialidade, conselho/registro flexível, contatos, endereço e preferências.
- `subscriptions`, `plan_entitlements`, `usage_counters`: preparados para Essencial, Profissional e Premium, sem impor limites artificiais agora.
- `onboarding_tasks`: checklist retomável por conta.

### Operação da agenda

- `locations`: endereço, CEP, contato, observações, tipo e ativação.
- `rooms`: pertence a um local; nome, observações e ativação. Local online não exige sala.
- `availability_rules`: dia da semana, horário, local, sala e modalidade, com período de validade.
- `schedule_blocks`: férias, feriado, compromisso, reunião ou motivo personalizado.
- `appointment_types`: tipos padrão e personalizados por conta.
- `appointments`: intenção na agenda; paciente, início, fim, local, sala, modalidade, tipo e status.
- `appointment_events`: histórico imutável de criação, confirmação, início, cancelamento e reagendamento, incluindo motivo.
- `encounters`: atendimento efetivamente realizado, separado do agendamento.

### Paciente e prontuário

- Evoluir `patients` com CPF, profissão, escolaridade, escola e campos de contato, sem duplicar informações de responsáveis.
- `patient_identifiers`: valores normalizados para detectar possíveis duplicidades por CPF, nome/data e telefone; apenas alerta, nunca mesclagem automática.
- `anamneses` + `anamnesis_versions`: formulário atual e histórico imutável das versões.
- `evolutions` + `evolution_versions`: vínculo com atendimento realizado e status próprio.
- `care_plans`: estrutura futura de plano/acompanhamento.
- `documents` + `document_versions`: metadados, categoria, retenção e arquivo privado.
- `consents`: tipo, versão do texto, concessão, revogação e evidência.
- `professional_signatures`: arquivo privado separado, sem URL pública.
- `clinical_document_templates` e `clinical_documents`: estrutura preparada, sem editor/gerador avançado na primeira fase.

### Pacotes e recebimentos

- `packages`: paciente, quantidade contratada, valor, início, validade, status e vínculo opcional ao pacote renovado.
- `package_sessions`: cada consumo ligado a um atendimento realizado; restrição impede consumo duplicado.
- Sessão só é utilizada quando o atendimento é concluído segundo a regra aprovada; agendado, cancelado e reagendado não consomem.
- Alertas derivados, não armazenados manualmente: `used / total >= 75%` = próximo da renovação; 1–2 restantes = urgente; 0 = encerrado. A prioridade mais alta prevalece.
- `receivables`: cobrança simples por atendimento ou pacote, valor, desconto, vencimento e status.
- `payments`: pagamentos parciais ou totais, forma e data. Isso evita perder histórico ao corrigir uma cobrança.

### Auditoria e privacidade

- `audit_events`: ator, conta, entidade, registro, ação, data e diferenças permitidas.
- Não registrar texto clínico, conteúdo de documento, tokens, CPF completo ou outros dados sensíveis nos logs operacionais.
- Histórico automático para paciente, agenda, atendimento, pacote, evolução, documento e financeiro.
- Soft delete/arquivamento onde retenção for necessária; exclusão física somente por processo específico e juridicamente validado.
- Exportação por paciente e por conta; trilha da solicitação e do arquivo gerado.
- Política de privacidade e termos versionados com histórico de aceite.
- Papéis de controlador/operador serão definidos nos documentos jurídicos; o software não presumirá essa classificação.

## Regras de agenda

- `starts_at` e `ends_at` continuam sendo a fonte real; a grade de 30 minutos é apenas visual e para encaixe do movimento.
- Mover preserva duração, paciente, local, sala e modalidade; por padrão altera somente início/fim.
- Validar na interface para resposta rápida e novamente no banco para segurança.
- Impedir sobreposição do próprio profissional, do paciente e da sala cadastrada na conta, além de bloqueios e disponibilidade.
- Usar garantia transacional/atômica no banco para eliminar corrida entre dois salvamentos simultâneos.
- Reagendamento mantém o mesmo agendamento e cria evento histórico; cancelamento exige motivo e nunca apaga o registro.
- Modalidade e local permanecem independentes; online pode ter local/sala opcional.
- Feriados começam como aviso configurável; bloqueio obrigatório poderá ser ativado por preferência.

**Limite real do produto individual:** o sistema consegue impedir que este profissional reserve duas vezes uma sala cadastrada por ele. Não consegue conhecer a reserva feita por outro profissional em um sistema externo da clínica. Garantia global de ocupação exigiria integração com a agenda da clínica, fora do MVP.

## Navegação proposta

### Celular

- Barra principal: **Meu Dia**, **Agenda**, **Pacientes**, **Busca**, **Mais**.
- “Mais”: Pacotes, Financeiro, Locais e Salas, Disponibilidade, Documentos, Relatórios, Privacidade e Configurações.
- Todas as ações essenciais terão alternativa por toque: “Mover horário” além de arrastar.

### Desktop

- Menu lateral por grupos: Rotina; Clínica; Gestão; Configurações.
- Prontuário do paciente com abas próprias: Resumo, Histórico, Anamnese, Evoluções, Documentos, Pacotes e Financeiro.
- Agenda: Dia, Semana, Mês e Lista no MVP; mapa visual será a visão semana/dia com blocos contínuos. “Mapa geográfico” não será assumido.

## Dependências entre módulos

```text
Conta e permissões
  → Perfil e onboarding
  → Locais → Salas → Disponibilidade/Bloqueios
  → Pacientes
  → Agenda → Atendimento realizado → Evolução
  → Pacotes → Consumos
  → Recebimentos/Pagamentos
  → Relatórios e exportações
  → LGPD, auditoria e documentos clínicos
```

## Escopo por fases

### Fase 0 — Fundação segura

- Introduzir conta profissional, membros/papéis, `account_id` e migração dos dados existentes.
- Separar acesso a dados por domínio.
- Reforçar auditoria, validação de arquivos e testes de isolamento.
- Preservar autenticação, onboarding atual e URLs existentes.

### Fase 1 — Rotina e agenda completa

- Perfil profissional ampliado e checklist de configuração.
- Locais, salas, disponibilidade e bloqueios.
- Tipos personalizados, agenda Dia/Semana/Mês/Lista e mapa visual.
- Criar, editar, mover, cancelar, reagendar, iniciar e concluir com histórico e conflitos atômicos.

### Fase 2 — Prontuário robusto

- Cadastro ampliado e alerta de duplicidade.
- Separação entre agendamento e atendimento realizado.
- Status/versionamento de anamnese e evolução.
- Linha do tempo central, documentos versionados, consentimentos e assinatura privada.

### Fase 3 — Pacotes e financeiro simples

- Pacotes, consumo por atendimento concluído, alertas e renovação sem sobrescrever histórico.
- Recebimentos e pagamentos simples.
- Visões no Meu Dia, paciente, pacotes e financeiro.

### Fase 4 — Relatórios, exportação e LGPD

- Indicadores por período, paciente, local, sala, modalidade, status, pacote e recebimento.
- CSV/Excel para dados tabulares; PDF para prontuário e relatórios formatados.
- Exportação completa, retenção, solicitações do titular e históricos de aceite.

### Futuro, fora do MVP

- Envio real por WhatsApp, e-mail e SMS.
- Editor e geração avançada de documentos clínicos.
- Cobrança da assinatura e limites por plano.
- Acessos delegados ativos, portal do paciente e integrações com agendas externas.
- Recursos de IA assistiva, sempre com revisão profissional e sem diagnóstico automático.

## Critérios de validação por fase

- Migrações aditivas, reversíveis quando possível, com cópia de segurança lógica e nenhuma perda de dados.
- Permissões testadas com duas contas e tentativas explícitas de referência cruzada.
- Fluxos completos em desktop e celular: criar, editar, cancelar, reagendar, concluir e exportar conforme a fase.
- Testes concorrentes para conflitos de profissional, paciente, sala e bloqueio.
- Arquivos privados testados contra acesso direto e entre contas.
- Revisão de performance com índices por `account_id`, datas, status e relacionamentos.
- Revisão ao final de cada fase para remover duplicação e confirmar persistência, permissões e paridade mobile.

## Fora do desenho

- Sublocação e aluguel de salas.
- Repasse e faturamento interno de clínica.
- Cadastro/gestão de vários profissionais como núcleo da conta.
- Estoque, gestão hospitalar, folha, contabilidade ou ERP.
- Compartilhamento global de pacientes ou prontuários entre contas.
