# Homologação da Central de Comunicação

## O que foi alterado

- **Administração → Central de Comunicação** (`/admin/comunicacao`): composição com prévia, envio individual, geral ou para o grupo em teste padrão, caixa de conversas, leitura por destinatário, respostas, reenvio individual, arquivo e restauração.
- **Área profissional → ícone de envelope no cabeçalho** (`/mensagens`): caixa privada, contador, marca de prioridade, histórico e resposta no mesmo diálogo. No painel administrativo, respostas não lidas entram no sino que já existia.
- Dados persistidos em `communication_dispatches` (chave de proteção contra reenvio acidental), `communication_conversations` e `communication_messages`. A estrutura `professional_notifications` foi reutilizada para as notificações profissionais. Os chamados de suporte existentes continuam separados: são iniciados pelo profissional e têm outro fluxo.
- Cada comunicado cria uma conversa separada por titular elegível. Considera-se ativo o titular com perfil concluído, acesso comercial vigente, conta e vínculo ativos, não bloqueado nem em exclusão; contas de administração são excluídas do público. O grupo em teste corresponde ao acesso `trial`. A seleção de destinatários é feita no banco na confirmação, não na prévia.
- Somente `super_admin` não revogado, de conta ativa e não bloqueada, pode acessar a caixa administrativa. O destinatário precisa coincidir com a sessão e com a conta da conversa para ler ou responder. As tabelas de conversas e mensagens têm RLS e não aceitam acesso direto pelo aplicativo; as operações públicas validam sessão e permissões novamente. As notificações administrativas ao profissional são filtradas por destinatário. Nem o texto nem o assunto são copiados para a tabela de notificações.
- “Entregue” significa persistido na caixa interna, não enviado por e-mail nem confirmado como visualizado. A primeira abertura registra o horário de leitura. O contador é atualizado após ações locais, ao voltar à aba e a cada 20 segundos enquanto a aba está ativa. Arquivar não apaga nada: o histórico permanece no portal, mas a conversa precisa ser restaurada antes de novas respostas. Um reenvio é um novo envio individual com prévia; a mensagem original permanece intacta.
- A central não muda as regras de acesso do portal. Uma conversa passa a contar como dado vinculado na verificação de exclusão de contas vazias, assim como outros registros da conta. Nessa situação, o fluxo existente orienta a usar a desativação para preservar o histórico.

## Roteiro de aceitação: ambiente isolado, sem profissionais reais

Use uma cópia/ambiente de homologação sem contas reais elegíveis. Não use “Todos os profissionais ativos” ou “Grupo” na base de produção para testar. Prepare quatro sessões isoladas em perfis de navegador separados: um administrador principal, dois profissionais elegíveis A e B (A em teste padrão e B fora do teste) e um profissional C bloqueado ou inativo. Use marcadores únicos no assunto, como `QA-COM-01`, e texto fictício sem informações de pacientes.

| Caso | Procedimento e resultado esperado |
| --- | --- |
| 1. Individual | Enviar para A usando a prévia. O envio indica 1 destinatário; somente A recebe. |
| 2. Geral e grupo | Enviar para todos: A e B recebem separadamente, C não recebe. Enviar para o grupo em teste padrão: só A recebe. |
| 3. Offline e sessão nova | Manter A deslogado durante o envio. Entrar novamente e conferir as mensagens na caixa. |
| 4. Contador | Antes de abrir, conferir o contador no envelope. Com a sessão já aberta, enviar de outra sessão e aguardar a atualização. |
| 5. Leitura | Abrir a mensagem como A. Verificar o contador e confirmar que a administração vê a primeira data e hora de leitura; reabrir não deve trocá-las. |
| 6. Resposta profissional | Responder como A e conferir a resposta no histórico e o incremento no sino administrativo. |
| 7. Resposta administrativa | Abrir a conversa como administrador, conferir a resposta de A e responder. A deve receber uma nova notificação na mesma conversa. |
| 8. Histórico | Conferir três itens em ordem, com identificação dos autores e horários. Buscar pelo nome e assunto; conferir filtros de resposta pendente e não lidas. |
| 9. Separação visual | Buscar o assunto do envio individual na sessão B: nenhum resultado. Em um comunicado geral, A e B não veem respostas um do outro. |
| 10. Separação no backend | Na homologação, com token de B, chamar as operações de abertura e resposta com o ID da conversa de A: ambas devem ser negadas. Com token profissional, as operações de envio administrativo e arquivamento também devem ser negadas; sem sessão, não execute as operações. |
| 11. Prioridade | Marcar um novo envio como prioritário. Conferir o selo na lista e na conversa e o filtro correspondente. |
| 12. Arquivo e restauração | Arquivar: sai da lista padrão administrativa, aparece em Arquivadas e mantém o histórico no portal. Restaurar: volta à lista e admite novas respostas. |
| 13. Reenvio e duplicidade | Clicar rapidamente duas vezes em Confirmar: deve haver um envio. Reenviar a partir da conversa: uma nova prévia e, após confirmação, uma nova conversa individual, com a original preservada. |

## Verificado nesta implementação

As migrações foram aplicadas no Lovable Cloud. O catálogo do banco confirmou as permissões das operações, o bloqueio de chamadas anônimas e de acesso direto às tabelas de comunicação pelo aplicativo, e a política que restringe os avisos ao destinatário. As três operações compartilhadas com o módulo de assinatura excluem os comunicados administrativos: eles não ocupam a lista de avisos comerciais e só são marcados como lidos pela abertura da conversa. Uma consulta sem sessão confirmou que ela não é reconhecida como administrador nem destinatário. Na última consulta, havia zero envios, conversas, mensagens e notificações administrativas. Nenhum comunicado foi enviado a profissionais reais.

## Teste automatizado do banco em homologação

Em um banco local isolado, com a base do TeraClini já instalada, aplique o [SQL da Central de Comunicação](migrations/central-de-comunicacao.sql) e prepare as quatro contas fictícias descritas acima. Configure `COMMUNICATION_QA_DB` com a URL do banco local e `COMMUNICATION_QA_ADMIN`, `COMMUNICATION_QA_A`, `COMMUNICATION_QA_B` e `COMMUNICATION_QA_INACTIVE` com os UUIDs dos usuários de autenticação correspondentes (não os IDs das contas). O SQL já foi aplicado no Lovable Cloud; não é necessário reaplicá-lo em produção. Com Node 22 e as dependências instaladas, execute `node scripts/test-communication-db.mjs`. O script exige que somente A e B estejam elegíveis, usa o papel autenticado nas operações e reverte a transação ao fim. Ele exercita os fluxos do banco, mas não substitui o roteiro no navegador para verificar login, persistência entre sessões, interface e atualização do contador.

O script e os testes de aceitação no navegador ainda não foram executados. O build e o preview também não foram verificados nesta sessão. A entrega só pode ser homologada depois que um administrador de teste enviar uma mensagem no preview, um profissional de teste recebê-la e responder, e o administrador visualizar a resposta.
