# Reconstrução definitiva do pré-cadastro e cadastro de pacientes

## Diagnóstico confirmado
- O clique recebe o ID correto e muda a URL para `/pacientes/pre-cadastros/$id`.
- A rota de lista também está funcionando como rota pai, mas renderiza a própria tela em vez de um espaço para a rota filha.
- Por isso, clique, acesso direto e recarregamento mantêm a lista visível e nunca montam o detalhe. A causa raiz é a composição da rota, não o botão, overlay ou o banco.
- O banco contém solicitações pendentes reais, com isolamento por conta e funções transacionais já existentes. Esses dados serão preservados e não serão usados em aprovações destrutivas durante o diagnóstico.

## O que será corrigido
1. Transformar `/pacientes/pre-cadastros` em rota de layout e mover a lista para a folha `index`, permitindo que `$id` seja renderizado corretamente.
2. Consolidar a entrada de pendências para abrir diretamente o pré-cadastro correto, com navegação tipada e atualização dos dados após cada ação.
3. Revisar a tela de detalhe para mostrar dados revisáveis, respostas originais preservadas e histórico do processo, sem expor conteúdo clínico em logs ou URLs.
4. Reforçar a aprovação transacional para ser idempotente, bloquear duplicidade sem decisão explícita, preservar campos existentes quando o novo valor estiver vazio e retornar o mesmo `patient_id` em toda a aplicação.
5. Manter o formulário compartilhado e o schema canônico já usados no cadastro manual, formulário público e revisão profissional; corrigir apenas divergências comprovadas.

## Banco e segurança
- Reutilizar `patient_registration_links`, `patient_registration_requests`, `patients`, `guardians`, `anamneses` e `audit_events`; não criar entidades paralelas.
- Manter RLS por conta e permissões explícitas.
- Fazer alterações somente aditivas e transacionais.
- Registrar eventos técnicos sem copiar CPF, contato, endereço ou respostas clínicas.
- Não alterar nem aprovar solicitações reais existentes durante testes destrutivos; os testes completos usarão dados descartáveis da conta autorizada e serão removidos ao final quando seguro.

## Validação
- Testar com sessão profissional real: gerar link, abrir sem login, preencher e enviar.
- Confirmar a solicitação no banco e sua pendência na interface.
- Clicar no registro, abrir o detalhe correto, recarregar e acessar a URL diretamente.
- Editar e salvar; confirmar persistência sem alterar a resposta original.
- Aprovar uma vez e em clique duplo; confirmar um único paciente, vínculo e histórico.
- Confirmar lista de pacientes, ficha, busca e seleção na agenda com o mesmo `patient_id`.
- Testar possível duplicidade, link inválido/expirado/revogado/usado, isolamento entre contas e celular.
- Executar testes automatizados e verificar erros de compilação, console, rede e banco.

## Limite de conclusão
A tarefa só será concluída quando o fluxo real chegar da criação do link à ficha do paciente. Qualquer etapa não executada será relatada como pendente, nunca como aprovada apenas por compilação.
