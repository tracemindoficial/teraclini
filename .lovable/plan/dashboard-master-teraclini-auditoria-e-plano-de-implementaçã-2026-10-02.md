# Dashboard Master TeraClini — auditoria e plano de implementação

## Diagnóstico atual

- **Autenticação:** e-mail/senha e Google já funcionam. Chamadas internas podem exigir sessão validada no servidor, com token anexado automaticamente e proteção contra requisições cruzadas.
- **Contas e isolamento:** existem `accounts`, `account_members`, `profiles` e `user_roles`. As 25 tabelas públicas estão com RLS ativa; dados clínicos são isolados por conta.
- **Papéis atuais:** `owner`, `assistant` e `finance` são papéis internos de cada conta. Nenhum representa administração global da plataforma.
- **Auditoria existente:** `activity_log` e `audit_events` existem, porém são vinculados a uma conta e não servem diretamente para ações globais do operador.
- **Dados comerciais:** não existem tabelas de planos, assinaturas, mensalidades, pagamentos, conciliação ou configurações comerciais. Não existe integração de pagamento ativa.
- **Uso:** há dados reais que permitem contagens agregadas de contas, pacientes e agendamentos, mas não há telemetria confiável de login, acesso recente ou uso por módulo. Nenhum dado retroativo será inventado.
- **Interface:** a identidade TeraClini, gráficos, tabelas, filtros, paginação, estados de carregamento e navegação responsiva podem ser reaproveitados. A navegação do terapeuta não deve ser usada como navegação master.
- **Estado real observado:** 10 contas, 10 perfis, 3 onboardings concluídos e 7 pendentes. Os históricos atuais de atividade e auditoria estão vazios. Esses números são apenas diagnóstico; o painel sempre consultará a base real.

## Arquitetura proposta

```text
Sessão autenticada
      |
      v
Área master separada (/admin/*)
      |
      v
Autorização master validada no servidor
      |
      +--> consultas comerciais e agregadas
      +--> comandos administrativos confirmados
      +--> auditoria administrativa imutável

Contas clínicas e conteúdo clínico
      |
      +--> continuam protegidos pelas regras atuais
      +--> nunca são abertos pela central administrativa
```

### 1. Segurança e autorização

- Criar `platform_admins`, separada de `user_roles`, para papel global `super_admin`.
- Impedir inserção, alteração e exclusão por usuários comuns; concessão inicial somente por procedimento controlado e explícito.
- Criar verificação `is_platform_admin` e middleware servidor `requirePlatformAdmin`.
- Toda leitura ou escrita master passará por funções autenticadas com nova checagem de papel; nenhuma autorização dependerá de menu oculto ou estado do navegador.
- Criar uma árvore e um layout próprios para `/admin/*`, sem passar pelo onboarding ou pelo menu do terapeuta.
- Retornar acesso negado para usuários comuns e manter as tabelas administrativas indisponíveis ao acesso direto.

### 2. Modelo comercial mínimo e aditivo

Criar sem alterar tabelas clínicas:

- `platform_admins`: administradores globais autorizados.
- `subscription_plans`: nome, preço, periodicidade, prazo inicial, tolerância e estado do plano.
- `account_subscriptions`: conta, plano, preço contratado, início, próximo vencimento, competência, estado e cancelamento.
- `subscription_events`: histórico imutável de mudanças de assinatura.
- `payments`: cobrança/mensalidade, valor, vencimento, competência, pagamento, método, estado, transação, cobrança, origem e confirmação.
- `payment_events`: histórico imutável de conciliação e correções.
- `admin_notes`: observações estritamente administrativas, sem conteúdo clínico.
- `platform_audit_events`: ator, ação, alvo, campos alterados, resultado e horário; sem senhas, tokens ou conteúdo clínico.
- `commercial_settings`: parâmetros comerciais não secretos. Segredos futuros ficam fora do navegador.
- `usage_events`: eventos mínimos sem conteúdo clínico, com conta, usuário, módulo, ação e data; retenção e granularidade limitadas.

Todos os novos objetos terão chaves estáveis, índices, validações, `GRANT`s mínimos e RLS de negação por padrão. A migração será aditiva e reversível; nenhum paciente, prontuário, documento, atendimento ou evolução será movido ou apagado.

### 3. Definições e cálculos

- **Receita recebida:** somente pagamentos `confirmed`; exclui pendentes, vencidos, recusados, estornados e cancelados.
- **Receita prevista:** mensalidades emitidas e ainda válidas no período, sempre separada da receita recebida.
- **Receita recorrente estimada:** soma mensal normalizada das assinaturas pagas e ativas; não representa caixa recebido.
- **Usuário ativo:** conta com evento técnico autenticado no período; até a telemetria começar, o painel mostrará “dados disponíveis a partir de [data]”.
- **Utilização:** contagens de ações e registros por módulo, nunca textos, diagnósticos, nomes de pacientes ou conteúdo de sessões.
- **Duplicidade financeira:** identificadores idempotentes e restrições impedirão que a mesma cobrança/transação seja contabilizada duas vezes.
- Estados de conta, assinatura e pagamento permanecerão separados.

### 4. Telas

- `/admin`: indicadores de contas, onboarding, assinaturas, vencimentos, receita confirmada, receita prevista e uso; gráficos por período e atalhos para listas filtradas.
- `/admin/usuarios`: busca, filtros, ordenação, paginação, exportação controlada e ficha administrativa por conta.
- `/admin/assinaturas`: planos, ciclo comercial, mudanças de estado, cancelamento, reativação e histórico.
- `/admin/pagamentos`: conciliação manual de Pix, confirmação protegida, correções e histórico.
- `/admin/relatorios`: cadastros, receita confirmada, pendências, assinaturas e utilização; exportações auditadas.
- `/admin/configuracoes`: plano, preço, prazo inicial, tolerância, método de pagamento e suporte.
- Seções de vencimentos, utilização e auditoria serão visões dedicadas dentro dessa navegação, sem criar duplicação de dados.

### 5. Ordem de construção

1. **Fundação segura:** migração, papel master, concessão controlada, middleware, guardas e testes negativos.
2. **Dados comerciais:** planos, assinaturas, mensalidades, pagamentos e auditoria, sem cobrança automática.
3. **Leituras reais:** consultas agregadas, cálculos financeiros puros testados e telemetria mínima não clínica.
4. **Interface:** layout master e seis rotas, com filtros, paginação, gráficos, estados vazios e celular.
5. **Ações administrativas:** conciliação Pix manual, observações, cancelamento, reativação e restrição, sempre com confirmação e auditoria.
6. **Validação:** duas identidades descartáveis — uma master e uma comum — para provar acesso, bloqueios, isolamento, cálculos, idempotência, auditoria, ausência de conteúdo clínico e preservação dos dados.

## Riscos e controles

- **Autopromoção:** mitigada por tabela global sem escrita de usuários e validação obrigatória no servidor.
- **Vazamento entre contas:** consultas master projetam apenas dados cadastrais/comerciais e agregados; não oferecem leitura de tabelas clínicas.
- **Números financeiros enganosos:** recebido e previsto terão fontes, estados e rótulos separados.
- **Histórico incompleto:** login e uso anteriores não serão inferidos; o início da coleta ficará explícito.
- **Restrição indevida:** bloquear acesso comercial nunca excluirá dados; a regra de aplicação será definida e testada antes de ativar restrições.
- **Escalada operacional:** ações sensíveis exigem confirmação e criam auditoria imutável.
- **Produção:** nenhuma cobrança real, notificação ou restrição automática será ativada nesta entrega.

## Decisões necessárias antes da implementação

- Identificar qual usuário existente receberá a concessão inicial de `super_admin`.
- Confirmar ou substituir os parâmetros provisórios: R$ 67,00/mês, Pix, primeiro vencimento em 7 dias e prazo de tolerância.
- Autorizar a criação de duas identidades descartáveis para os testes obrigatórios de acesso e isolamento.
- Definir se a primeira entrega apenas registra restrições comerciais ou também bloqueia o acesso do terapeuta; por segurança, o padrão proposto é **registrar sem bloquear automaticamente**.
