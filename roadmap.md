# Roadmap

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
