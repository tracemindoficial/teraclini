# Financeiro profissional — validação de 7 de outubro de 2026

## Entrega
Reutilizados serviços, preços versionados, pacotes e atendimentos. Novas estruturas: títulos profissionais, recebimentos manuais e histórico imutável. Financeiro separado das assinaturas da plataforma. Consultas com filtros/paginação/agregação no banco; relatório CSV por páginas. Contratação e agendamento completo em uma transação; pré-pago e por sessão exclusivos, sem consumo ao criar e sem duplicar contadores.

## Segurança e preservação
Permissão financeira exige membro ativo e papel owner/finance. Nenhuma escrita direta autenticada nas tabelas financeiras; operações serializam no título, limitam o saldo e conservam histórico. RLS em todas as estruturas, sem grants anônimos. Administração não recebe acesso a conteúdo financeiro de pacientes. Preços contratados não podem ser reescritos depois de existir título. Reenvio de contratação/recebimento tem chave única. Exclusão de cliente incorpora as novas dependências pela inspeção dinâmica existente.

## Verificação executada
- 69 testes Vitest passaram, incluindo 13 regras financeiras: centavos exatos, R$720−R$300=R$420 parcial, pago/pendente/cancelado, estorno, rateio exato, 4/8 datas e descontos.
- Transação real desfeita: cadastro de serviço/preço, avulso R$180, contratação 4 sessões pré-pagas e 8 quinzenais por sessão, repetição idempotente, consumo zero ao criar, uma realizada e outra cancelada, recebimento pendente/confirmado, parcial/total, estorno, auditoria, rejeição de reescrita de preço e relatório confirmado R$420 após estorno.
- Duas contas transacionais: acesso próprio permitido, acesso cruzado negado, tentativa de recebimento estrangeiro recusada; sob papel authenticated, SELECT não retorna títulos/recebimentos/histórico estrangeiros. Transação desfeita.
- Playwright autenticado: contratação pelo formulário de quatro sessões, detalhe do pacote, recebimento R$300, saldo parcial R$420, reload preservando valores, estorno visível e CSV baixado. Sem erros de navegador. Cinco áreas abriram sem alertas.
- Build automático OK.

## Correções encontradas durante verificação
Confirmação tinha variável de forma de pagamento ambígua; corrigida e repetidos testes. A rota pai de pacotes não exibia o detalhe filho; passou a compor lista ou Outlet. Horários da lista de sessões usam o mesmo fuso da agenda.

## Dados de teste
Apenas registros explicitamente QA foram persistidos no teste visual. Sessões e título foram cancelados, recebimento estornado, pacote cancelado e paciente/preço/serviço inativados. Nenhum registro real foi modificado. Os registros QA permanecem identificados e auditáveis, pois apagar histórico financeiro seria incompatível com os requisitos.

## Limites da validação
Não foram executadas requisições concorrentes simultâneas nem validação visual em aparelho móvel. O teste de duas contas foi transacional no banco, não duas sessões de navegador. CSV validado com o histórico QA, não grandes volumes. Nenhum provedor de pagamento, cobrança automática ou emissão de PIX foi integrado. Registros antigos entram no financeiro somente por inclusão explícita, sem backfill automático de valores históricos.
