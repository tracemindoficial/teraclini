# Administração definitiva de clientes

## Objetivo

Garantir que a Central administrativa gerencie os profissionais assinantes por suas contas, sem tratar pacientes como clientes e sem implementar cobrança nesta etapa.

## Estrutura confirmada

- A identidade de acesso é o usuário autenticado.
- O cliente/tenant é `accounts`, ligado ao proprietário e ao perfil profissional.
- Os pacientes pertencem ao `account_id` do cliente e continuam isolados por conta.
- A autorização global usa `platform_admins`, separada dos papéis da conta profissional.
- Situação operacional, bloqueio de segurança e assinatura já são estados independentes.

## Implementação

1. Renomear a experiência administrativa de “Usuários” para “Clientes”, preservando as URLs atuais para não quebrar acessos existentes.
2. Completar lista e detalhe com nome, e-mail, telefone, profissão/especialidade disponível, cadastro, último acesso, situação e ações reais.
3. Aplicar permissões por papel também às leituras: somente funções operacionais autorizadas verão dados cadastrais e executarão edição ou controle de acesso.
4. Tornar alteração de e-mail e seus registros operacionais uma única operação confiável, sem permitir sucesso sem auditoria.
5. Preservar a separação entre ativação/inativação, bloqueio administrativo e assinatura; nenhuma regra financeira bloqueará clientes nesta fase.
6. Manter a Central restrita a dados cadastrais, suporte, assinatura e contagens; nenhum conteúdo clínico será retornado.

## Banco e segurança

- Reutilizar `accounts`, `profiles`, `account_members`, `user_roles`, `platform_admins` e `platform_audit_events`; não criar tabela paralela de clientes.
- Manter RLS e isolamento clínico por `account_id`.
- Manter operações privilegiadas no servidor, com validação do administrador e confirmação explícita.
- Registrar ator, cliente afetado, campos alterados, valores administrativos anterior/novo e horário, sem conteúdo clínico.
- Corrigir apenas alertas do linter relacionados a este fluxo; não ampliar permissões nem desabilitar RLS.

## Validação real

- Entrar com uma conta administrativa autorizada e abrir lista, detalhe, URL direta e recarregamento.
- Criar contas descartáveis para editar um campo, salvar, recarregar e confirmar persistência no banco.
- Inativar uma conta descartável, confirmar bloqueio de login e de dados; reativar e confirmar retorno do acesso.
- Usar duas contas descartáveis com dados próprios para testar isolamento e tentativas cruzadas.
- Confirmar que a Central recebe apenas contagens clínicas e nunca nomes, prontuários, documentos ou conteúdo de pacientes.
- Remover integralmente os dados descartáveis ao final, sem tocar nas quatro contas existentes.
- Executar testes automatizados, linter de segurança e navegação em desktop e celular.

## Limite de conclusão

A tarefa só será concluída após o fluxo real de ver, abrir, editar, salvar, inativar e reativar um cliente persistir no banco e refletir no acesso. PIX e cobrança recorrente permanecem fora desta etapa.