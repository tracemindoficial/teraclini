# Perfis, permissões e administração integrada

## Objetivo

Consolidar dois níveis de acesso sobre a mesma conta:

- **Profissional:** usa apenas o próprio espaço, dados, relatórios e suporte.
- **Administrador do SaaS:** mantém integralmente o próprio espaço profissional e recebe, adicionalmente, acesso à administração global.

A implementação será aditiva. Autenticação, dados existentes, módulos profissionais, área administrativa já construída e isolamento entre contas serão preservados.

## Ajustes principais

### 1. Entrada e alternância de áreas

- Fazer todo usuário ativo, inclusive administrador, entrar na área profissional após o login.
- Manter onboarding como destino quando ainda estiver incompleto.
- Mostrar no menu profissional uma seção **Administração** somente quando a autorização administrativa for confirmada pelo servidor.
- Adicionar na central administrativa uma ação clara **Voltar para a área profissional**, sem logout ou segunda conta.
- Manter `/admin` e todas as rotas filhas protegidas no servidor contra usuários comuns.

### 2. Perfis e permissões

- Manter `platform_admins` separado dos papéis da conta profissional: ser administrador é uma camada adicional, não um substituto do perfil profissional.
- Expor na administração o perfil efetivo de cada usuário (`Profissional` ou `Administrador`) sem permitir autopromoção pelo navegador.
- Centralizar operações globais em funções autenticadas que validam o administrador antes de qualquer leitura ou alteração entre contas.
- Proteger concessão e remoção administrativa com confirmação, auditoria e regra que impeça remover o último administrador.
- Preservar o bloqueio de contas suspensas/encerradas e o isolamento por `account_id` para todo conteúdo profissional.

### 3. Indicadores reais e uso da plataforma

- Ampliar a visão geral com totais reais de contas, ativas, suspensas/encerradas, cadastros de hoje, 7 e 30 dias e onboarding pendente.
- Calcular atividade recente e acessos a partir da telemetria já existente, deixando explícito o início da coleta e sem estimar histórico ausente.
- Exibir funcionalidades mais usadas e evolução diária de atividade e cadastros com dados reais.
- Usar atendimentos concluídos como indicador operacional real. O produto não possui módulo de “avaliações”; nenhum número fictício com esse nome será criado.
- Criar páginas específicas de **Uso do Sistema** e **Métricas**, mantendo relatórios administrativos e comerciais separados.

### 4. Gestão de usuários

- Completar busca, filtros, ordenação e paginação da lista existente.
- Incluir perfil, situação, cadastro, último acesso, última atividade, uso, plano quando existente e ações permitidas.
- Ampliar o detalhe administrativo com atividade técnica, contagens operacionais agregadas, assinatura e chamados, sem abrir prontuários, nomes de pacientes, documentos ou conteúdo clínico.
- Manter suspensão/reativação com confirmação explícita e auditoria imutável.

### 5. Suporte

- Criar chamados e mensagens vinculados à conta e ao usuário, com estados **Aberto**, **Em atendimento**, **Aguardando usuário** e **Resolvido**.
- Permitir ao profissional criar, consultar e responder apenas aos próprios chamados.
- Permitir ao administrador consultar todos, responder, alterar estado e visualizar o histórico.
- Exibir orientação para não inserir dados clínicos e não relacionar chamados a pacientes ou prontuários.
- Auditar alterações administrativas de atendimento sem copiar o texto das mensagens para o log.

### 6. Auditoria e configurações

- Enriquecer a tela de atividades com administrador, horário, ação, conta afetada, campos alterados e resultado, sem conteúdo clínico.
- Manter configurações pessoais em `/configuracoes` e configurações globais em `/admin/configuracoes`.
- Preservar planos e automações comerciais vazios enquanto valores e regras não forem definidos; nenhuma cobrança automática será criada.

## Segurança e dados

- Criar as novas tabelas com permissões explícitas, RLS e políticas próprias na mesma migração.
- Profissionais acessam somente seus chamados; administradores usam funções protegidas para visões globais.
- Nenhuma rota, menu ou chamada do navegador será considerada autorização suficiente.
- A administração continuará vendo apenas metadados e contagens operacionais, nunca conteúdo clínico.
- Toda alteração de conta, permissão ou chamado feita pela administração exigirá validação no servidor e registro de auditoria.

## Validação

- **Usuário comum:** área profissional completa, suporte próprio, ausência do menu administrativo e bloqueio direto de todas as rotas/funções administrativas.
- **Administrador:** entrada na área profissional, acesso adicional à Administração, retorno entre áreas sem logout e preservação das funções profissionais.
- **Dados reais:** conferir totais, atividade, atendimentos concluídos, gráficos e lista diretamente contra o banco; estados sem histórico permanecem zerados ou explicitamente indisponíveis.
- **Isolamento:** testar leitura e alteração cruzada de chamados e dados profissionais, além de tentativas de autopromoção.
- **Qualidade:** testes automatizados, tipos, compilação, linter de segurança e fluxos visuais autenticados em desktop e celular.
- Usar identidades descartáveis somente durante a validação e removê-las integralmente ao final, sem tocar em dados reais.

## Critérios de conclusão

- Uma única conta administrativa funciona simultaneamente como profissional e administradora.
- Usuários comuns não veem nem acessam administração global.
- Usuários, suporte, uso, métricas, relatórios, configurações e atividades administrativas funcionam com dados reais.
- Isolamento entre contas e minimização de dados clínicos continuam protegidos no banco e no servidor.
