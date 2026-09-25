# Fase 1 — Rotina e agenda completa

## Objetivo

Transformar a agenda atual em uma operação completa para o profissional individual: vários locais e salas, horários disponíveis, bloqueios, tipos personalizados e histórico seguro de cada agendamento.

## Entregas

1. **Fundação da agenda**
   - Criar salas vinculadas aos locais.
   - Criar regras semanais de disponibilidade e bloqueios por período.
   - Criar tipos de atendimento personalizáveis sem remover os tipos atuais.
   - Criar histórico imutável de criação, alteração de horário, cancelamento, início e conclusão.
   - Preservar todos os agendamentos e locais existentes.

2. **Conflitos seguros**
   - Impedir sobreposição do profissional, paciente e sala no banco, inclusive em salvamentos simultâneos.
   - Recusar horários bloqueados e, quando houver disponibilidade configurada, horários fora dela.
   - Manter local e modalidade como informações independentes.

3. **Locais, salas e horários**
   - Ampliar a tela de locais para cadastrar, editar, ativar e desativar salas.
   - Criar telas de disponibilidade e bloqueios acessíveis no desktop e em “Mais” no celular.
   - Ligar sala e disponibilidade ao checklist do Meu Dia.

4. **Fluxo do agendamento**
   - Incluir sala e tipo personalizado no cadastro do agendamento.
   - Oferecer ações próprias para mover horário, reagendar, confirmar, iniciar, concluir, registrar falta e cancelar com motivo.
   - Remover a exclusão física do fluxo comum; cancelamentos preservam o histórico.

5. **Agenda visual**
   - Manter a lista atual como visão “Lista”.
   - Criar visões reais de Dia, Semana e Mês com blocos contínuos proporcionais ao horário.
   - Exibir paciente, horário, local, sala, modalidade e situação de forma legível.
   - No celular, manter todas as ações por toque e adaptar grades largas sem perder função.

6. **Validação da fase**
   - Testar criação e edição de sala, disponibilidade e bloqueio.
   - Testar criação, movimentação, reagendamento, cancelamento, início e conclusão.
   - Testar conflitos de profissional, paciente, sala, bloqueio e salvamento simultâneo.
   - Validar isolamento entre contas, persistência após novo acesso e os fluxos no desktop e celular.

## Detalhes técnicos

- As mudanças serão aditivas: novas tabelas e colunas opcionais primeiro; campos antigos continuam disponíveis durante a transição.
- O tipo fixo atual coexistirá temporariamente com `appointment_types`, evitando perda e permitindo migração gradual.
- A proteção concorrente usará restrições temporais no banco, não apenas uma verificação na tela.
- Novas tabelas terão acesso restrito à conta profissional, permissões explícitas e auditoria sem conteúdo clínico.
- A agenda será dividida em componentes menores por visão e os acessos a dados continuarão separados por domínio.

## Fora desta fase

Prontuário versionado, consentimentos, pacotes, recebimentos, relatórios avançados e exportações permanecem nas fases seguintes.
