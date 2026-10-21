# Gestão de Assinaturas e Degustações

## Auditoria inicial (resumo)

Já existe, e será reutilizado:
- `subscription_plans`, `account_subscriptions` (uma por conta), `subscription_events` (histórico), `payments` (com confirmação manual auditada) e `platform_audit_events` (append-only).
- Estados atuais de assinatura: aguardando primeiro pagamento, ativa, pagamento pendente, carência, restrita, cancelamento solicitado, cancelada.
- Telas administrativas: Assinaturas, Pagamentos, Vencimentos, Clientes e detalhe do cliente; autorização por `platform_admins` no servidor.
- Bloqueio de conta (suspensa/encerrada/bloqueada) já aplicado no banco e na navegação, independente da assinatura.

Não existe hoje: período de teste, degustação administrativa, preço por ciclo (47 → 59,90), notificações para o profissional, rotina agendada, provedor de cobrança ou de e-mail.

## O que será construído

1. **Acesso comercial (fonte única)** — nova tabela de concessões por conta: teste padrão (7 dias) ou degustação administrativa (dias, início, fim calculado, motivo, observações, conversível, data prevista de cobrança). Cada alteração gera evento imutável com valores anterior/novo e motivo. Uma única concessão de teste padrão por conta (garantida por índice único).
2. **Teste padrão automático** — iniciado no servidor quando o onboarding é concluído (não em visita, login ou recarga). Início/fim em timestamp do servidor; exibição em horário de Brasília.
3. **Política comercial** — plano único mensal; ciclos 1–3 a R$ 47,00 e a partir do 4º a R$ 59,90, calculados por função pura testada e no banco. Cobrança de um ciclo é única por assinatura+ciclo.
4. **Configurar cobrança** — ação administrativa explícita com resumo (preço, primeira cobrança, período promocional, preço regular, situação, renovação) e confirmação. Sem cobrança automática: os pagamentos continuam sendo registrados/confirmados manualmente pelo admin.
5. **Estado derivado único** — função no banco que devolve um estado sem contradição: teste ativo, degustação ativa, aguardando contratação (teste expirado), assinatura ativa, pagamento pendente, vencida, suspensa, cancelada. Concessão vigente sempre prevalece sobre expiração.
6. **Restrição ao expirar** — módulos clínicos bloqueados no banco (helpers de membro) e na navegação, levando à tela "Minha assinatura". Dados nunca são apagados. Exceções: admins e concessões vigentes.
7. **Notificações ao profissional** — nova estrutura reutilizável com chave única por evento (sem duplicidade), avisos do 5º e 7º dia com os textos exatos e botão "Ver opções de assinatura". Canal externo registrado como "não configurado" até existir provedor de e-mail; nunca será indicado como enviado.
8. **Rotina agendada** — endpoint protegido por segredo, chamado de hora em hora pelo agendador do Cloud: avisa no 5º dia, expira no 7º, respeita pagamentos/concessões, registra sucesso/falha e é idempotente para reprocessamento.
9. **Painel "Gestão de Assinaturas e Degustações"** — indicadores (cadastrados, testes ativos, terminando em 2 dias, expirados, degustações, ativas, pendentes, vencidas/suspensas, receita confirmada), tabela pesquisável/filtrável e detalhe com ações: liberar degustação, prorrogar, configurar cobrança, registrar pagamento, suspender, reativar, histórico de notificações e de alterações.
10. **Tela do profissional "Minha assinatura"** — situação, dias restantes, valores visíveis e solicitação de contratação (registrada para o admin), sem simular checkout.

## Segurança

- Todas as escritas por RPC `SECURITY DEFINER` verificando papel administrativo do chamador; nenhum preço, duração ou estado aceito do navegador sem validação.
- Profissional só lê a própria situação e as próprias notificações; não consegue conceder, prorrogar, alterar preço nem confirmar pagamento.
- Contas existentes: sem teste retroativo — recebem situação "assinatura/concessão legada" preservando acesso atual, até o admin decidir.

## Testes

Vitest para datas (7 dias, 5º dia, fuso), ciclos (47/47/47/59,90) e estado derivado; testes reais com contas descartáveis para teste, aviso único, expiração sem perda de dados, degustação sem cobrança, prorrogação, cobrança futura, bloqueio de não-admin, rotina executada duas vezes sem duplicar; desktop e celular. Dados de QA removidos ao final.

## Dependências externas

- Envio por e-mail exige configurar um domínio de e-mail; sem isso, só aviso no painel.
- Cobrança automática (PIX/cartão) fica fora: exige provedor de pagamento.
