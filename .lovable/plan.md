# Gestão administrativa de usuários TeraClini

## Diagnóstico atual

A edição cadastral já chega ao servidor e ao banco, mas ainda há fragilidades no fechamento do fluxo: o formulário pode conservar valores antigos, o fechamento ocorre mesmo quando a gravação falha, e algumas operações de acesso não são transacionais.

O estado de conta hoje distingue apenas `active`, `suspended` e `closed`. A suspensão bloqueia a área profissional e os dados, mas não existe um bloqueio administrativo separado, com justificativa, data e revogação efetiva da sessão. A conta do próprio administrador já não pode ser suspensa, porém ainda falta proteger a última conta administrativa válida e impedir perda acidental desse acesso.

## Implementação

1. **Consolidar edição cadastral**
   - Sincronizar o formulário com o usuário carregado e redefinir os campos ao abrir.
   - Validar nome, telefone e campos profissionais antes do envio.
   - Fechar o formulário somente depois de confirmação real do servidor.
   - Manter atualização, auditoria e recarregamento da lista/detalhe após salvar.
   - Preservar a troca de e-mail como operação de identidade separada.

2. **Modelar estados administrativos sem apagar dados**
   - Manter `accounts.status` para ativação/desativação operacional.
   - Adicionar bloqueio administrativo separado, com motivo, autor e datas de bloqueio/desbloqueio.
   - Exibir claramente estado da conta, bloqueio e licença como conceitos distintos.
   - Não alterar vínculos clínicos, proprietário, pacientes ou documentos.

3. **Proteger operações sensíveis no servidor**
   - Usar funções transacionais para ativar, desativar, bloquear e desbloquear.
   - Autorizar somente administradores operacionais ativos.
   - Impedir auto-bloqueio/auto-desativação e proteger o último administrador master ativo.
   - Registrar estado anterior, novo estado, motivo, autor e resultado em histórico imutável.
   - Invalidar o acesso imediatamente ao bloquear ou desativar, sem expor credenciais ao navegador.

4. **Completar os controles administrativos**
   - Mostrar estados reais na lista e no detalhe.
   - Disponibilizar editar, ativar/desativar, bloquear/desbloquear e consultar histórico.
   - Solicitar confirmação e justificativa nas ações restritivas.
   - Atualizar a tela apenas após resposta válida e mostrar a mensagem real em falhas.
   - Incluir filtro por papel administrativo além dos filtros existentes.

5. **Validar sem dados reais**
   - Executar tipagem, testes automatizados e verificação de segurança.
   - Usar contas controladas somente se houver uma sessão administrativa autorizada.
   - Verificar persistência após recarregar, bloqueio de acesso, restauração e negação para profissional comum.
   - Registrar como pendente qualquer cenário que não possa ser comprovado no ambiente disponível.

## Resultado esperado

A administração poderá editar cadastros, ativar/desativar e bloquear/desbloquear contas com persistência, autorização no servidor, histórico confiável e proteção da conta administrativa principal, sem excluir dados clínicos.
