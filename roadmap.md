# Roadmap

## Unificação de serviços, pacotes, agenda e financeiro profissional

- [x] Auditar código e esquema real: serviços, preços, pacotes, agendamentos, consumo e financeiro existente; 26 testes de regras passaram
- [x] Preparar proposta com estruturas reutilizáveis, lacunas, riscos e arquitetura final para aprovação
- [ ] Implementar somente após autorização explícita do usuário — bloqueado nesta etapa por aprovação ainda não concedida

## Gestão rápida e exclusão segura de clientes

- [x] Auditar vínculos reais, autorização, exclusão atual e consultas administrativas
- [x] Implementar edição leve, busca por nome/e-mail/telefone e paginação no banco
- [x] Implementar exclusão individual real de identidade e perfil, com revalidação e auditoria preservada
- [x] Validar edição, persistência, busca por telefone, exclusão descartável, ausência de identidade/perfil e preservação de auditoria
- [x] Validar visualmente recusa por vínculos e autoexclusão; executar 56 testes automatizados
- [x] Transferir agregações da visão geral para o banco e conferir carregamento administrativo
- [ ] Comparar desempenho antes/depois em condições equivalentes: baseline autorizado anterior não foi capturado; não declarar ganho percentual
- [ ] Exercitar falha externa e retomada, concorrência, paginação com mais de 20 identidades e isolamento ponta a ponta entre dois profissionais; não gerar dados de clientes reais para simular volume

Relatório em `docs/admin-client-management-report.md`. Nenhuma identidade existente foi excluída; somente a conta QA criada nesta implementação. Os históricos imutáveis permanecem e a conta mínima fica arquivada, explicitamente diferenciada da exclusão da identidade.

## Agenda visual semanal

- [x] Auditar e reaproveitar dados, conflitos, disponibilidade, bloqueios e ações existentes
- [x] Validar renderização dos sete dias, alternância Dia/Lista e abertura do formulário no horário clicado
- [x] Validar renderização autenticada em desktop, tablet e smartphone sem alterar dados clínicos
- [x] Executar 43 testes automatizados, incluindo duração, fuso, intervalos e preservação da duração no movimento
- [ ] Validar visualmente blocos proporcionais e ações de detalhes com dados descartáveis
- [ ] Validar persistência ponta a ponta: criação, movimento, conflitos, cancelamento e consumo de pacotes

Implementados calendário, filtros, detalhes, movimento parcial e motivo obrigatório de cancelamento. Migração 0028 preserva horários históricos, aplica o fuso de cada regra de disponibilidade e revoga exclusão física autenticada. Build automático passou. Nenhum atendimento real foi criado ou alterado; ações mutáveis não foram declaradas validadas ponta a ponta. O erro relatado em `src/pages/Index.tsx` não foi reproduzido; esse arquivo não existe no código atual.

## Concluído

- [x] Corrigir autenticação, primeiro acesso e onboarding mínimo
- [x] Validar persistência, logout/login, isolamento e mobile
- [x] Auditar a especificação ampliada e aprovar a arquitetura

## Fase 0 — Fundação segura

- [x] Criar conta profissional extensível, membros e papéis separados
- [x] Migrar os dados existentes para `account_id` sem perda
- [x] Criar checklist retomável e auditoria sem conteúdo clínico
- [x] Exibir o checklist no Meu Dia e validar os fluxos existentes
- [x] Validar isolamento por conta, criação de novo usuário e regressão mobile

## Fase 1 — Rotina e agenda completa

- [ ] Auditar agenda, locais, navegação e regras existentes
- [ ] Implementar salas, disponibilidade e bloqueios
- [ ] Implementar tipos de atendimento e histórico de eventos
- [ ] Completar visões Dia, Semana, Mês e Lista
- [ ] Implementar criar, editar, mover, cancelar, reagendar, iniciar e concluir
- [ ] Garantir conflitos atômicos por profissional, paciente, sala, disponibilidade e bloqueio
- [ ] Validar persistência, isolamento, desktop e celular

## Próximas fases

- [ ] Fase 2 — Prontuário robusto e registros versionados
- [ ] Fase 3 — Pacotes e financeiro simples
- [ ] Fase 4 — Relatórios, exportação e LGPD

## Pacotes de atendimentos

- [x] Criar modelo seguro de pacotes, vínculos e histórico
- [x] Implementar criação, edição, cancelamento e renovação
- [x] Integrar sessões à agenda e calcular utilização pela situação do atendimento
- [x] Exibir pacotes na lista, paciente, atendimento e Meu Dia
- [ ] Validar alertas, histórico, isolamento, desktop e celular

## Refatoração estrutural

- [x] Auditar toda a base e priorizar melhorias sem alterar comportamento
- [x] Refatorar arquitetura, componentes, hooks, dados, autenticação e tipagem
- [x] Validar fluxos públicos, proteção de acesso, build, desktop e celular após a refatoração

## Identidade visual TeraClini

- [x] Revisar visualmente todas as telas e aplicar a marca oficial sem alterar funcionalidades
- [x] Aplicar logotipo, símbolo, favicon e paleta oficial em desktop e celular
- [x] Validar consistência, legibilidade e ausência de regressões visuais

## Pré-cadastro de pacientes por link

- [x] Auditar cadastro atual, segurança, isolamento e componentes reutilizáveis
- [x] Criar links seguros com expiração, revogação, cópia e compartilhamento
- [x] Criar formulário público em etapas com validações e perguntas condicionais
- [x] Criar solicitações, revisão, edição, recusa e aprovação explícita
- [ ] Impedir duplicidades e vincular dados ao paciente oficial após aprovação
- [ ] Exibir pendências em Pacientes e Meu Dia sem revelar dados sensíveis
- [ ] Validar fluxo completo, isolamento, expiração, desktop e celular

## Refinamento visual TeraClini 2026

- [x] Integrar o novo logo oficial sem moldura e atualizar o favicon
- [x] Implementar menu desktop contraível e navegação mobile refinada
- [x] Refinar Meu Dia, Agenda, Pacientes e Prontuário em todos os tamanhos
- [x] Consolidar telas compartilhadas, formulários e diálogos
- [ ] Validar identidade, persistência, acessibilidade e responsividade

## Estabilização pré-lançamento

- [x] Adicionar recuperação e redefinição segura de senha
- [x] Confirmar exclusões de atendimentos e locais antes da remoção
- [x] Bloquear alteração de pacote em atendimento concluído
- [x] Corrigir histórico de pacote e destaque do menu de pré-cadastros
- [x] Criar testes automatizados para regras de pacotes e falhas de autenticação
- [x] Validar login e recuperação públicos em celular e desktop
- [ ] Validar fluxos internos e isolamento com duas contas fictícias autorizadas

## Dashboard Master administrativa

- [x] Auditar autenticação, contas, permissões, dados comerciais, atividade e interface
- [x] Criar fundação isolada de administrador global e dados comerciais sem cobrança automática
- [x] Criar consultas protegidas, métricas reais e telemetria mínima sem conteúdo clínico
- [x] Criar visão geral, usuários, assinaturas, pagamentos, relatórios e configurações
- [x] Conceder o primeiro acesso master ao usuário autorizado
- [ ] Confirmar e cadastrar plano, valor, vencimento e tolerância
- [x] Validar permissões e isolamento com identidades descartáveis autorizadas

## Administração e acessos independentes

- [x] Reforçar o bloqueio de dados para contas suspensas ou encerradas
- [x] Impedir alteração do status da conta pelo próprio profissional
- [x] Direcionar administradores e profissionais aos espaços corretos após entrar
- [x] Criar detalhe de usuário, alteração auditada de situação e histórico administrativo
- [x] Identificar claramente o painel administrativo e o painel profissional
- [x] Validar três contas descartáveis, suspensão e tentativas de acesso entre contas
- [x] Remover integralmente as três identidades e os dados fictícios após o teste
- [ ] Validar visualmente as telas internas com uma sessão administrativa aprovada

## Central de Ajuda interativa

- [x] Criar conteúdo pesquisável com categorias, tutoriais, etapas e FAQ baseados nas funções reais
- [x] Integrar Ajuda ao menu, cabeçalho e páginas principais do profissional
- [x] Criar tutoriais guiados e introdução opcional no primeiro acesso
- [x] Criar gestão administrativa de categorias, conteúdos, visibilidade, mídia e ordem
- [x] Registrar pesquisas, visualizações, buscas sem resultado e conclusões sem dados clínicos
- [ ] Validar acesso comum, acesso administrativo, busca, orientação e celular

## Perfis, permissões e administração integrada

- [x] Fazer o administrador entrar na área profissional por padrão e preservar todas as funções profissionais
- [x] Exibir acesso adicional à Administração somente para administrador autorizado
- [x] Completar suporte, uso, métricas e permissões administrativas com dados reais
- [x] Reforçar autorização no servidor, isolamento entre contas e auditoria administrativa
- [ ] Validar usuário comum, administrador, métricas reais, desktop e celular

## Camada comercial e aquisição

- [x] Auditar landing, autenticação, licenças, pagamentos, suporte e identidade existentes
- [x] Criar apresentação comercial completa com conteúdo baseado em recursos reais
- [x] Expor somente licenças ativas e preparar a seleção antes do cadastro
- [x] Integrar login, cadastro, privacidade, termos e métricas comerciais anônimas
- [x] Validar aquisição, navegação, acessibilidade, desktop e celular

## Central operacional administrativa

- [x] Editar cadastro e e-mail com confirmação, validação e auditoria
- [x] Enviar recuperação, reenviar acesso, exigir nova senha e encerrar sessões
- [x] Criar linha do tempo operacional sem conteúdo clínico
- [x] Criar ações manuais auditadas para plano, ativação, suspensão, extensão e cancelamento
- [x] Ampliar suporte com prioridade, responsável e encerramento
- [x] Criar notificações derivadas com estado de leitura
- [ ] Validar visualmente os fluxos internos com uma sessão administrativa disponível

## Auditoria funcional geral

- [x] Corrigir edição administrativa de usuário com persistência e histórico
- [x] Separar ativação, bloqueio administrativo e licença, com proteção do administrador principal
- [x] Listar identidades independentemente de perfil, pagamento ou assinatura e permitir busca por identificador
- [x] Abrir cadastros incompletos em modo diagnóstico sem criar perfis ou dados financeiros artificiais
- [x] Corrigir alertas administrativos para abrir o cadastro pelo identificador do usuário
- [x] Remover seis contas de teste vazias e preservar a conta incerta com paciente vinculado
- [ ] Validar edição, ativação e bloqueio ponta a ponta com uma sessão administrativa autorizada
- [x] Restaurar aprovação atômica do pré-cadastro sem enfraquecer o isolamento por conta
- [x] Validar contrato de retorno, CPF na revisão e atualização dos caches de pré-cadastro
- [x] Validar aprovação do pré-cadastro e continuidade para agendamento com sessão profissional autorizada
- [ ] Auditar controles, formulários, modais, filtros, notificações e rotas sem ações mortas
- [ ] Validar persistência, erros, permissões e isolamento com identidades fictícias
- [ ] Consolidar matriz de funcionalidades e relatório final com pendências reais

## Cadastro unificado de pacientes

- [x] Auditar e comparar cadastro manual, pré-cadastro, persistência e aprovação
- [x] Centralizar modelo, validação e campos completos do paciente
- [x] Usar o cadastro completo compartilhado nos fluxos manual e público
- [x] Tornar o salvamento manual e a aprovação transacionais e sem perda de dados
- [x] Reutilizar o formulário canônico também na revisão profissional
- [x] Adicionar máscaras, opções de sexo e preenchimento editável por CEP
- [ ] Validar cadastro manual, pré-cadastro, aprovação, persistência, duplicidade e isolamento — bloqueado: não há sessão profissional disponível para o teste autenticado

## Auditoria forense de execução

- [x] Confirmar a cadeia real de rota, página e componentes executados na prévia atual
- [x] Comparar os módulos reportados com o código-fonte e os artefatos servidos
- [x] Confirmar o contrato real de banco, RLS e funções do pré-cadastro
- [x] Corrigir falhas comprovadas de link, cópia, atualização da lista e validação compartilhada
- [x] Validar o fluxo autenticado completo de geração até aprovação

## Cadastros básicos padronizados

- [x] Auditar especialidades, serviços, valores, pacotes, agenda e isolamento existentes
- [x] Centralizar especialidades e vínculos do perfil sem perder o texto legado
- [x] Evoluir tipos de atendimento existentes para serviços configuráveis por conta
- [x] Criar tabela de preços em centavos com versões e vínculos históricos
- [x] Integrar serviços e valores à agenda, atendimentos e pacotes
- [x] Criar gestão pesquisável de especialidades, serviços e valores nas configurações
- [x] Validar duplicidade, ativação, desativação, histórico, isolamento, desktop e celular

## Reconstrução definitiva do pré-cadastro

- [x] Reproduzir o clique, acesso direto e recarregamento da página de detalhe
- [x] Identificar a causa raiz na composição das rotas de pré-cadastro
- [x] Corrigir a rota pai para permitir lista e detalhe independentes
- [x] Consolidar navegação direta da pendência para o registro correto
- [x] Preservar respostas originais e registrar histórico operacional sem conteúdo sensível
- [x] Reforçar duplicidade, idempotência e atualização sem apagar dados existentes
- [x] Validar geração, envio, revisão, aprovação e leitura do paciente ponta a ponta
- [ ] Validar isolamento entre contas e o fluxo completo em celular

## Administração definitiva de clientes

- [x] Consolidar a entidade administrativa como conta profissional, sem confundir cliente com paciente
- [x] Restringir dados e ações da lista/detalhe conforme o papel administrativo
- [x] Tornar alterações cadastrais, de e-mail e acesso integralmente auditáveis
- [x] Validar lista, detalhe, edição, persistência, inativação e reativação com conta descartável
- [x] Confirmar bloqueio real de acesso, isolamento clínico, RLS e não regressão
- [x] Documentar o estado da estrutura para a futura cobrança, sem implementar PIX
