# Reestruturação de acessos administrativos e contas independentes

## Objetivo

Consolidar a estrutura já existente do TeraClini em dois espaços claramente separados:

- **Central administrativa:** operação global da plataforma, sem acesso ao conteúdo clínico.
- **Espaço profissional:** conta individual, com pacientes, agenda, registros e configurações isolados por conta.

A implementação será aditiva, preservará dados e funcionalidades atuais e não criará módulos fictícios de avaliações.

## O que será ajustado

### 1. Autenticação e destino após entrar

- Centralizar a decisão de destino após e-mail/senha, Google e sessão já existente.
- Direcionar administradores autorizados para `/admin`.
- Direcionar profissionais ativos para onboarding ou Meu Dia, conforme o perfil.
- Impedir o uso do espaço profissional por contas suspensas ou encerradas, com mensagem clara e encerramento seguro da sessão.
- Registrar acesso administrativo sem armazenar conteúdo clínico, credenciais ou dados sensíveis.

### 2. Autorização e isolamento

- Manter administradores globais em cadastro separado dos papéis internos da conta profissional.
- Reforçar no banco que somente membros ativos de contas ativas acessam dados da prática.
- Confirmar que usuários não podem promover a si mesmos nem consultar a lista de administradores.
- Manter todas as operações administrativas em funções protegidas no servidor; a proteção visual das páginas não será tratada como segurança suficiente.
- Revisar políticas, permissões, funções e consultas de todas as tabelas vinculadas à conta.

### 3. Central administrativa

- Manter o painel com métricas reais já disponíveis: contas, cadastros, onboarding, utilização e dados comerciais existentes.
- Completar a gestão de usuários com busca, filtros, paginação, ordenação, situação da conta e acesso ao detalhe.
- Criar a página `/admin/usuarios/$id` com dados cadastrais, situação, último acesso, onboarding, assinatura e contagens operacionais agregadas.
- Permitir suspender e reativar uma conta com confirmação explícita e auditoria imutável.
- Criar a área de atividades administrativas com eventos reais e paginação.
- Adicionar “Meu perfil” e identificação visual inequívoca da Central administrativa.

> A central não exibirá nomes de pacientes, prontuários, anamneses, evoluções, documentos ou qualquer conteúdo clínico. Somente metadados e contagens operacionais serão usados, em conformidade com minimização de dados.

### 4. Espaço do profissional

- Identificar claramente a navegação como espaço do profissional.
- Manter “Meu Perfil” restrito aos campos editáveis do próprio usuário.
- Preservar os módulos existentes: Meu Dia, Agenda, Pacientes, Pacotes, Locais, Documentos, Relatórios e Configurações.
- Não permitir edição de papel ou permissão pela interface do profissional.

### 5. Auditoria e dados de teste

- Validar com um administrador e três identidades descartáveis, cada uma com registros próprios.
- Testar acesso administrativo, redirecionamento comum, bloqueio de `/admin`, leitura/alteração/exclusão entre contas, autopromoção e suspensão.
- Remover integralmente as identidades e registros fictícios após os testes, sem tocar em dados reais.
- Executar testes automatizados, verificação de tipos, qualidade, compilação, linter de segurança e testes visuais em desktop e celular.

## Decisões técnicas

- `platform_admins` continua sendo a única fonte de autorização global; papéis da prática permanecem em `user_roles`.
- `accounts.status` continua usando `active`, `suspended` e `closed`; não será criado um segundo campo concorrente.
- Dados clínicos continuam protegidos por `account_id` e políticas de isolamento; colunas legadas obrigatórias `user_id` são preservadas.
- Alterações administrativas usarão funções autenticadas no servidor e cliente privilegiado somente após validar o administrador.
- Os eventos administrativos guardarão ator, ação, conta afetada, campos alterados, resultado e horário, sem conteúdo clínico.

## Critérios de conclusão

- Administrador autorizado entra e chega à Central administrativa.
- Profissional ativo entra e chega ao próprio onboarding ou Meu Dia.
- Profissional comum não acessa nenhuma página ou função administrativa.
- Conta suspensa/encerrada não acessa dados da prática.
- Manipulação de IDs entre contas falha para leitura, alteração e exclusão.
- Usuário não consegue conceder a si mesmo acesso administrativo.
- Lista, detalhe, situação e atividades administrativas funcionam com dados reais.
- Nenhum dado clínico é exposto na central.
- Dados fictícios de QA são removidos ao final.
