# Pré-cadastro profissional e aprovação confiável

## Objetivo
Consolidar o pré-cadastro já existente sem reconstruir o módulo: corrigir a aprovação na causa real, completar somente as lacunas compatíveis com a arquitetura atual e comprovar persistência, isolamento e atualização da interface.

## Execução
1. **Auditar o fluxo ativo**
   - Mapear link, formulário público, gravação, revisão, duplicidades, aprovação, auditoria e atualização dos módulos.
   - Comparar o código e as migrações com a definição realmente ativa no banco.

2. **Corrigir primeiro a aprovação**
   - Manter uma única operação transacional no banco, com validação de associação à conta, estado pendente, duplicidade e paciente existente.
   - Garantir retorno explícito do paciente e confirmação do estado persistido antes de exibir sucesso.
   - Traduzir falhas esperadas para mensagens seguras e manter nova tentativa disponível.
   - Invalidar os dados de solicitações, paciente, lista e tarefas após confirmação.

3. **Completar o modelo existente sem duplicação**
   - Reutilizar as tabelas, telas, formulário e componentes atuais.
   - Preservar respostas originais e separar correções revisadas quando a estrutura atual exigir isso.
   - Completar eventos/notificações apenas se a auditoria confirmar que não há mecanismo equivalente reutilizável.
   - Ampliar validações e detecção de duplicidades apenas para campos já suportados pelo modelo real.

4. **Segurança e integridade**
   - Manter proteção por conta, permissões restritas e operações críticas no servidor.
   - Não expor dados clínicos em URLs, mensagens, notificações ou auditoria.
   - Não alterar nem usar pré-cadastros reais nos testes.

5. **Validação**
   - Executar testes automatizados de validação, transição de estado, duplicidade e mensagens de falha.
   - Testar em navegador o link público e o fluxo profissional em desktop e celular.
   - Com sessão profissional autorizada, criar dados isolados, aprovar, verificar o estado no banco, recarregar e confirmar a persistência; depois remover somente esses dados de teste.
   - Registrar claramente qualquer teste autenticado que permaneça bloqueado por ausência de sessão.

## Entrega
Relatório final com diagnóstico, causa raiz comprovada, diferenças para o modelo solicitado, alterações no código e banco, funcionamento transacional, preservação do isolamento, testes reais, limitações e riscos residuais.
