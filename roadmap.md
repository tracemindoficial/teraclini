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

## Refatoração estrutural
- [x] Auditar toda a base e priorizar melhorias sem alterar comportamento
- [x] Refatorar arquitetura, componentes, hooks, dados, autenticação e tipagem
- [ ] Validar fluxos existentes, build, desktop e celular após a refatoração
