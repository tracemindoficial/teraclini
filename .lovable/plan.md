# Módulo de pacotes de atendimentos

## Objetivo
Criar o controle completo de pacotes por quantidade de sessões para terapeutas individuais, integrado aos pacientes e à agenda atual, sem renovação ou cobrança automática.

## Estrutura funcional
- Criar pacotes com paciente, serviço opcional, qualquer quantidade inteira positiva, valor opcional, início, término opcional, periodicidade, observação e limite de alerta.
- Vincular cada atendimento a no máximo um pacote; cada atendimento mantém data, horário, modalidade, local, status e valor próprios.
- Considerar somente atendimentos com status `realizado` como sessões utilizadas. Agendados, confirmados, em andamento, cancelados e faltas não consomem sessão nesta primeira versão.
- Calcular utilizadas e restantes a partir dos atendimentos vinculados, sem duplicar contador no pacote.
- Exibir estados derivados: ativo, próximo da renovação, esgotado, expirado e cancelado.
- Renovar criando um novo pacote com ID próprio e vínculo ao anterior, preservando todo o histórico.

## Telas e fluxos
- Adicionar Pacotes à navegação e criar lista com filtros por paciente, situação, serviço, período e renovação.
- Criar formulário reutilizável para novo pacote, edição segura e renovação pré-preenchida.
- Criar detalhe do pacote com progresso, valores, sessões vinculadas, histórico e ações.
- Integrar pacote ao agendamento e mostrar identificação discreta na agenda e no atendimento.
- Adicionar seção Pacotes na ficha do paciente e indicador único de renovação no Meu Dia.
- Garantir a mesma capacidade de criar, consultar, editar e renovar no celular.

## Segurança e dados
- Criar tabelas de pacotes e eventos de histórico com `account_id`, permissões explícitas, RLS e validação de referências na mesma conta.
- Adicionar `package_id` e valor aplicado ao atendimento, com validação no banco.
- Bloquear redução da quantidade abaixo das sessões já realizadas e impedir vínculo de paciente/pacote incompatível.
- Registrar criação, alteração, renovação, cancelamento e encerramento sem conteúdo clínico.
- Manter valores como nulos quando não definidos; `R$ 0,00` continuará representando gratuidade real.

## Validação
- Testar pacotes de 4, 8 e quantidade personalizada, com e sem valor.
- Testar vínculo, conclusão, contador, alerta, renovação com quantidade diferente e histórico preservado.
- Testar edição, redução inválida, reagendamento/cancelamento, ausência de duplicação e independência entre horários.
- Validar isolamento por conta, permissões, desktop, celular e regressão dos fluxos existentes.

## Limites desta entrega
- Não criar cobrança, assinatura recorrente, renovação automática, emissão fiscal, WhatsApp ou notificações multicanal.
- O financeiro continuará independente; nesta entrega o pacote apenas preserva valores negociados e apresenta o estado “A definir” quando não houver valor.
