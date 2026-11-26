# TeraClini — Auditoria de cobrança e publicação (parte 3)

## A. Problemas encontrados

O fluxo auditado ainda é de contratação assistida, não de checkout. `src/lib/subscription-admin.functions.ts` envia a configuração de cobrança e a confirmação de Pix/outro meio às rotinas administrativas do banco. `ProfessionalDetail.tsx` identifica esses pagamentos como registros locais. A busca no repositório não encontrou implementação de checkout, cliente de provedor de pagamentos ou rota de confirmação do provedor.

O domínio informado pelo repositório é `https://teraclini.lovable.app`. O estado do catálogo no Lovable Cloud não comprova qual revisão ou banco atende esse domínio, nem o preço que um visitante realmente vê. Sem observar os dois ambientes não é possível atribuir eventual divergência a cache, publicação antiga ou ambiente diferente.

Há uma inconsistência confirmada entre **vencimento** e **acesso comercial**: das duas assinaturas ativas, uma tem `next_due_on` anterior à data atual em São Paulo e ainda é avaliada como `active` por `account_commercial_state`. Isso não comprova falta de pagamento fora do sistema. O job `process_trial_lifecycle` trata degustações e notificações; na função instalada não há transição de inadimplência de assinaturas. A outra assinatura está em dia pelo campo `next_due_on`, mas seu estado de acesso comercial é `suspended`: contrato ativo e possibilidade de acesso não são a mesma coisa.

## B. Causas identificadas

O catálogo ativo contém o valor corrigido, mas as assinaturas existentes preservam seus próprios valores contratuais. Essa diferença é intencional: histórico e contrato vigente não demonstram o preço de uma nova contratação. Uma confirmação manual também não comprova cobrança, liquidação ou conciliação em um provedor.

## C. Correções realizadas

O cartão de oferta compartilhado por `/` e `/planos` ganhou um identificador estável no HTML em `MarketingLanding.tsx`, sem alteração visual. O verificador `scripts/verify-public-offer.mjs` compara as respostas anônimas dessas duas rotas nos dois ambientes, exige uma única oferta a R$ 67,00/mês e confere o destino do botão de cadastro. Ele retorna falha se encontrar preço antigo, oferta adicional, rota sem cartão ou destino incorreto e registra os cabeçalhos de cache disponíveis quando a oferta confere. A revisão do deploy e a renderização no navegador continuam sendo verificações separadas.

Nenhuma integração foi habilitada: não há provedor nem ambiente de homologação verificável nesta execução. Não se criaram cobranças, não se registraram confirmações artificiais e não se alteraram pagamentos, contratos, contas ou permissões.

## D. Testes executados

Consultas somente leitura no Lovable Cloud, sem extrair dados pessoais ou clínicos:

- **Catálogo:** uma oferta ativa, `teraclini_mensal` — Plano Completo, 6.700 centavos em BRL, período de um mês, sem data de fim promocional.
- **Assinaturas:** duas ativas; nenhuma com identificador de assinatura de provedor. Nenhuma dessas duas estava registrada com preço regular de 6.700 centavos e zero ciclos promocionais.
- **Pagamentos:** cinco Pix confirmados, todos `admin_manual`, nenhum com `charge_id`, um com identificador de transação. Esse identificador, por si só, não implica integração.
- **Cálculo no banco:** `subscription_cycle_price` retornou 6.700 centavos tanto no 1º como no 13º ciclo para os termos da nova oferta. A função instalada `admin_configure_billing` copia o preço vigente para novas assinaturas com zero ciclos promocionais e não regrava os valores de contratos existentes ao alterar o vencimento.
- **Ativação e vencimento:** existem cinco eventos históricos `payment.confirmed → active`. A rotina manual `admin_record_subscription_payment` trava a assinatura, calcula o valor pelo contrato, registra o recebimento e avança `next_due_on` em um mês. Foram encontrados zero vínculos de pagamento com assinatura ausente ou conta divergente, e zero confirmações sem data de recebimento ou número de ciclo no recorte atual. Nenhum pagamento foi repetido ou lançado para testar essa rotina.
- **Cancelamento:** `LicenseActions.tsx` oferece ação administrativa; `admin_manage_subscription` registra cancelamento imediato e escreve auditoria. A rotina de registrar recebimento manual rejeita assinaturas canceladas. Não havia assinatura marcada como cancelada nem evento histórico `cancel → cancelled` no recorte. Não se executou a ação.
- **Agendamento:** 860 execuções com origem `schedule` tinham término e zero falhas registrados; a última observada terminou em 26/11/2026 às 15:07 UTC. A definição instalada confirma que o job não trata vencimentos de assinatura.
- **Permissões e isolamento:** foi consultada a configuração ativa. O catálogo expõe somente planos ativos ao papel anônimo; `account_subscriptions`, `payments` e `payment_events` têm controle de acesso por linha, sem regra de leitura direta. As operações administrativas auditadas não podem ser chamadas diretamente pelos papéis anônimo ou autenticado. `my_commercial_status` deriva a conta da sessão, sem aceitar conta por parâmetro. As regras de pacientes, consultas e documentos exigem vínculo ativo com a conta e acesso comercial. Isso é inspeção de configuração, não um teste de duas sessões.

Foram adicionados testes automatizados para o verificador de publicação (casos de preço correto, oferta antiga/extra, ausência de cartão e destino inválido). Nesta execução não havia terminal ou navegador disponível, portanto a suíte e o verificador HTTP não foram executados.

## E. Testes pendentes

- Build, navegação anônima e comparação entre preview e publicação: é necessário executar a aplicação, obter acesso HTTP aos dois ambientes e identificar a revisão publicada no Lovable.
- Pix, cartão, notificações do provedor, conciliação, ativação, vencimento, cancelamento e inadimplência: exigem provedor definido, credenciais de teste em segredos do Lovable, callback acessível e projeto de homologação isolado.
- Painel administrativo, portal, autenticação e isolamento entre profissionais em execução: exigem navegador e contas descartáveis autorizadas em homologação (duas contas comuns independentes e uma administrativa).

## F. Situação do preço

| Ponto | Evidência desta parte |
| --- | --- |
| Página pública | Fonte do catálogo no banco consultado: **R$ 67,00/mês**. Não observado no navegador do preview ou do domínio publicado. |
| Checkout | Não localizado no fluxo; nenhum valor foi enviado para cobrança. |
| Gateway | Nenhuma configuração ou cobrança de homologação disponível para verificação. |
| Painel administrativo | Há caminho de configuração manual; nenhuma nova configuração ou tela administrativa foi executada nesta parte. As duas assinaturas ativas consultadas são registros contratuais, não amostras da nova oferta. |

## G. Integridade do sistema

Nenhum dado clínico ou financeiro foi editado e nenhuma conta foi excluída. A ausência de um gateway integrado mantém a confirmação dependente de uma operação administrativa. Não se considera o isolamento entre contas homologado apenas pela leitura de código ou de permissões.

## H. Recomendações e critérios para encerrar a validação

### P0 — Separar alteração de código, build e publicação

1. Conferir se o build no Lovable inclui a revisão com o verificador e se a revisão foi publicada no domínio pretendido. Registrar a revisão, a hora e o projeto de banco de cada ambiente (sem copiar chaves).
2. Rodar `bun run test scripts/verify-public-offer.test.mjs` e, com as duas origens acessíveis anonimamente, executar `node scripts/verify-public-offer.mjs https://ORIGEM-DO-PREVIEW https://teraclini.lovable.app`. A evidência esperada são quatro respostas HTML com a mesma oferta e o mesmo destino de cadastro. Se o preview exigir autenticação do editor, verificar em uma origem de homologação acessível ou abrir o preview no navegador e registrar essa limitação. Se houver divergência, preservar as respostas e comparar revisão, projeto do banco e cabeçalhos antes de atribuí-la ao cache.
3. Abrir as duas rotas em sessão anônima no navegador e clicar no CTA real. Conferir se o cadastro abre após a hidratação, além de observar o HTML pelo verificador.

### P0 — Homologar cobrança e regra de inadimplência antes de cobrar automaticamente

| Cenário em homologação | Evidência para aprovação |
| --- | --- |
| Cadastro, confirmação de e-mail e onboarding | O cadastro não cobra nem ativa uma assinatura por si só. O portal apresenta a oferta vigente para conta sem contrato. |
| Checkout com Pix e cartão | O provedor recebe 6.700 centavos em BRL de uma fonte validada no servidor. Usar credenciais e meios de pagamento de teste, não registrar Pix manual como substituto. |
| Pagamento pendente, rejeitado, confirmado e confirmação repetida | Somente confirmação verificável do provedor muda o estado; a mesma cobrança repetida não registra outro pagamento, não cria outro ciclo e não avança o vencimento duas vezes. |
| Ativação e renovação | Depois da confirmação, o profissional consegue acessar a aplicação; painel, portal e provedor concordam sobre valor, estado e próximo vencimento. Vencimentos no fim do mês também devem ser testados. |
| Cancelamento e inadimplência | Acordar primeiro o prazo de tolerância e o momento de cortar acesso. Validar término da cobrança no provedor, preservação do histórico e recuperação após pagamento, sem alterar contratos existentes. Não usar apenas uma data atrasada para bloquear profissionais no banco ativo. |
| Isolamento e regressão | Duas contas comuns e uma administrativa em sessões separadas. Confirmar que cada profissional vê só sua assinatura, avisos e dados clínicos próprios, que conta comum não executa ações administrativas e que agenda, pacientes, documentos e finanças continuam acessíveis conforme o estado da conta. |

Manter a contratação manual explícita até a homologação. Uma integração depende da escolha do provedor, segredos de teste configurados no Lovable, endereço de confirmação acessível e contas de teste em ambiente isolado.
