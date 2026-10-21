# Central "Profissionais e Assinaturas"

## Diagnóstico atual

```text
Menu           Tela                         Fonte de dados (servidor)
Clientes       /admin/usuarios (+ /$id)     admin_client_directory, getAdminUserDetail,
                                            edição rápida, convite, exclusão segura,
                                            status/bloqueio da conta, papel admin
Assin./Degust. /admin/degustacoes           admin_subscription_overview/_directory/_detail,
                                            liberar/prorrogar/revogar degustação,
                                            configurar cobrança, registrar pagamento
Licenças       /admin/assinaturas           listAdminSubscriptions (tabela crua),
                                            ações de plano via admin_manage_subscription
```

Redundâncias: três listagens da mesma conta (chave real `accounts.id`, ligada a `profiles.id` = `auth.users.id` pelo `profiles.account_id`), três cálculos de status diferentes (status da conta, estado comercial, status da assinatura), e "Pagamentos" / "Vencimentos" repetem dados de cobrança da conta.

Riscos: perder uma ação existente ao retirar menus; status divergentes entre telas; links antigos quebrados. Mitigação: inventário de ações abaixo, um único cálculo de status no banco, redirecionamentos.

## O que será construído

1. **Nova central `/admin/profissionais`** (menu "Profissionais e Assinaturas"), uma linha por conta.
   - Indicadores clicáveis no topo (pessoas separados de financeiro), cada um aplicando o filtro.
   - Tabela com as colunas pedidas, datas DD/MM/AAAA, R$, etiquetas discretas, textos como "Degustação — faltam 5 dias", "Gratuito até 15/11/2026", "Sem cobrança configurada", "Nenhuma atividade registrada".
   - Busca por nome/e-mail, filtros (status, tipo de acesso, situação financeira, período), ordenação (cadastro, última atividade, fim da degustação, próximo vencimento), paginação no servidor. Em celular, a tabela vira cartões.
2. **Detalhe unificado `/admin/profissionais/$id`** com seções Perfil, Utilização, Acesso, Assinatura, Financeiro, Notificações, Histórico administrativo; carregado só ao abrir.
3. **Ações num só lugar**, exibidas conforme o status (sem ações incompatíveis): editar cadastro, liberar/prorrogar/revogar degustação, configurar cobrança (só sem assinatura ativa), registrar pagamento (só faturas em aberto), suspender/reativar, bloquear, cancelar assinatura, papel administrativo, exclusão segura existente. Toda ação espera confirmação do servidor e atualiza a tela sem recarregar.
4. **Navegação**: remover do menu Clientes, Assinaturas e Degustações e Licenças. `/admin/usuarios`, `/admin/usuarios/$id`, `/admin/degustacoes` e `/admin/assinaturas` redirecionam para a central/detalhe correspondente. Pagamentos, Vencimentos e Configurações (planos/preços) continuam como áreas secundárias. Links internos (visão geral, notificações, auditoria) passam a apontar para o novo detalhe.

## Regra de status principal (ordem de prioridade)

```text
1 Acesso suspenso      conta suspensa/encerrada ou bloqueada
2 Cadastro incompleto  onboarding não concluído
3 Fatura vencida       pagamento em aberto com vencimento passado
4 Pagamento pendente   pagamento em aberto não vencido
5 Assinatura ativa     assinatura válida e paga
6 Gratuito (admin)     concessão administrativa vigente
7 Degustação termina   degustação vigente, <= 2 dias
8 Degustação ativa     degustação vigente
9 Degustação expirada  sem concessão nem assinatura válida
10 Assinatura cancelada
11 Cadastro recente    onboarding concluído, sem acesso configurado
```
Contas antigas preservadas ("legacy") aparecem como acesso gratuito concedido. Uso efetivo vem só de `usage_events`/atividade real; sem dado, "sem atividade registrada".

## Detalhes técnicos

- Nova migração aditiva: função `admin_professional_lifecycle_status(account_id)` (fonte única do status, reutilizando `account_commercial_state`) e RPCs `admin_professional_directory(...)` e `admin_professional_summary(actor)` com `assert_billing_admin`/platform-admin, `security definer`, `execute` restrito ao `service_role`. Nada é apagado; RPCs antigas ficam intactas.
- Novas server functions em `src/lib/professional-admin.functions.ts` com `requirePlatformAdmin`; hooks em `src/lib/data/professional-admin.ts` com chaves em `query-keys.ts`; ações reutilizam as funções já existentes.
- Componentes em `src/components/admin/professionals/`; rotas só compõem a página. Componentes antigos (`SubscriptionManagement`, `AdminUserOperations`) são reaproveitados no detalhe, não duplicados.
- Regra de prioridade espelhada em `src/lib/professional-status.ts` com testes Vitest (um por regra), e checagem SQL comparando contagens dos indicadores com a listagem.
- QA: Playwright com sessão administrativa em desktop e celular; verificação de que nenhuma linha se repete, contagens batem, redirecionamentos funcionam, e que pacientes/atendimentos/pagamentos permanecem com as mesmas contagens antes e depois.
