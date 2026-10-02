# Central de Administração Operacional TeraClini

## Objetivo

Evoluir a central existente de visualização para operação real, preservando o SaaS profissional, o suporte atual, a área profissional e o isolamento de dados clínicos. O administrador continuará sendo também um usuário profissional.

## Diagnóstico

- Já existem: acesso administrativo separado, cinco papéis globais, visão geral, usuários, detalhe de conta, suspensão/reativação, suporte bidirecional, pagamentos manuais, auditoria, uso, métricas e assinaturas em leitura.
- Estão incompletos: edição cadastral, recuperação assistida, revogação de sessões, histórico unificado do usuário, ações de licença, notificações operacionais e troca de senha dentro da conta.
- A autorização atual permite ações demais a alguns papéis de leitura; cada comando será restringido no servidor.
- O painel continuará sem ler prontuários, anamneses, documentos ou conteúdo clínico. Apenas dados cadastrais, comerciais, suporte e contagens operacionais serão acessíveis.
- Serão mantidos os estados atuais da conta: **Ativa**, **Suspensa** e **Encerrada**. Suspensa será o bloqueio reversível; Encerrada será arquivamento, sem exclusão definitiva nesta entrega.

## Implementação

### 1. Segurança e auditoria

- Centralizar permissões por ação para `super_admin`, `support_admin`, `analyst`, `finance_admin` e `content_admin`.
- Restringir edição cadastral, recuperação, revogação de sessões e bloqueio aos papéis autorizados; licença ao financeiro/master; permissões e configurações ao master.
- Manter confirmação explícita para toda ação crítica e impedir auto-bloqueio do administrador atual e remoção do último master.
- Tornar os históricos administrativos, de licença e de acesso append-only no banco.
- Registrar ator, conta/usuário afetado, ação, campos alterados, resultado, data e origem técnica disponível, sem segredos ou conteúdo clínico.

### 2. Gestão completa do usuário

- Ampliar a ficha administrativa com nome, e-mail, foto, cadastro, último acesso, provedores de login, situação, dados profissionais, assinatura, suporte e utilização.
- Adicionar edição confirmada dos campos administrativos existentes: nome, profissão, registro, cidade, estado e modo de atendimento.
- Tratar o nome atual como campo único, sem inventar sobrenome ou telefone que ainda não existem no cadastro.
- Adicionar alteração sensível de e-mail com validação, verificação de duplicidade, atualização da autenticação, revogação de sessões e auditoria.
- Criar ações rápidas para editar cadastro, gerenciar acesso, suspender/reativar, abrir suporte, consultar histórico, utilização e licença.
- Não implementar impersonação nem exclusão definitiva.

### 3. Recuperação e segurança da conta

- Enviar link temporário de redefinição de senha pelo painel, sem criar ou exibir senha.
- Reenviar instruções conforme o método de autenticação; contas exclusivamente Google receberão orientação adequada, sem senha local artificial.
- Adicionar “Forçar redefinição no próximo acesso” e “Encerrar todas as sessões”, com confirmação, revogação real e registro administrativo.
- Criar em Configurações uma seção Segurança para o próprio usuário alterar a senha com senha atual, nova senha e confirmação.
- Redirecionar usuários marcados para redefinição antes de abrir a área profissional.

### 4. Licenças e assinaturas

- Transformar a lista atual em gestão manual real: criar/vincular licença, trocar plano, ativar, suspender/restringir, conceder período inicial, estender validade, cancelar e reativar.
- Reutilizar os planos e estados comerciais existentes, exigindo confirmação e gravando eventos imutáveis.
- Não criar cobrança automática, transação fictícia ou status financeiro inventado; pagamentos continuam separados e manuais até existir um provedor oficial.

### 5. Suporte e notificações

- Completar chamados com prioridade, responsável, fechamento e histórico, mantendo o conteúdo estritamente técnico/administrativo.
- Permitir iniciar um chamado a partir da ficha do usuário sem assumir sua identidade.
- Criar um centro operacional de notificações derivadas de dados reais: novos cadastros, chamados abertos, licenças próximas do vencimento, pagamentos pendentes/vencidos e contas suspensas.
- Adicionar leitura/dispensa de alertas por administrador sem duplicar a fonte dos eventos.

### 6. Histórico e experiência operacional

- Unificar na ficha do usuário uma linha do tempo de cadastro, logins disponíveis, alterações administrativas, recuperação, sessões, bloqueios, suporte e licença.
- Melhorar busca administrativa por nome, e-mail e ID; telefone ficará disponível quando o produto passar a armazenená-lo.
- Usar diálogos acessíveis para confirmações e formulários; manter tabelas navegáveis, cartões e ações adequados a celular.
- Exibir retorno claro de sucesso e erro após cada comando real.

## Banco e integrações

- Migração aditiva para flags de segurança, prioridade/responsável do suporte e estado de leitura das notificações; tabelas novas terão `GRANT`, RLS e índices no mesmo arquivo.
- Operações de autenticação serão executadas apenas em funções protegidas no servidor; nenhuma credencial administrativa chegará ao navegador.
- A lista detalhada de dispositivos/IP não será simulada: a autenticação atual fornece último acesso e permite revogação global, mas não oferece inventário confiável de dispositivos. A central mostrará somente dados reais disponíveis.
- Alteração de e-mail e recuperação dependem do serviço de e-mail transacional da autenticação estar habilitado no ambiente publicado.

## Validação

- Testes automatizados de permissões por papel, validação, transições de conta/licença e histórico append-only.
- Fluxos autenticados com usuário comum e administrador: editar cadastro, alterar e-mail, redefinir senha, forçar redefinição, suspender/reativar, revogar sessões, suporte, licenças, notificações e auditoria.
- Testes negativos de acesso direto às funções administrativas e de leitura entre contas.
- Verificação desktop e celular da central e da área profissional, incluindo retorno do administrador ao seu espaço profissional.
- Linter de segurança, tipos, testes, lint, compilação e validação visual final.

## Entrega

Relatório final separando: funções administrativas, segurança, suporte, usuários, recuperação de acesso, licenças, auditoria, ações do próprio usuário, ações exclusivas do administrador, testes, limitações e integrações externas necessárias.
