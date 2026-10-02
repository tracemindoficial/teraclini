# Auditoria funcional geral e correção dos fluxos TeraClini

## Objetivo

Validar o TeraClini como uma operação completa, sem reconstruir o produto nem alterar regras existentes: cada ação visível deve chegar à validação, servidor, banco, retorno e próxima etapa correta.

## 1. Matriz funcional e diagnóstico

- Inventariar rotas e elementos interativos das áreas pública, profissional e administrativa.
- Classificar cada ação como funcionando, parcial, quebrada, não implementada ou bloqueada por permissão/configuração.
- Priorizar autenticação, usuários, pacientes, pré-cadastro, aprovação e agenda; depois revisar dashboard, suporte, notificações, relatórios e configurações.
- Conferir o estado real do banco, funções, permissões e histórico antes de alterar qualquer fluxo.

## 2. Administração de usuários

- Validar a ficha administrativa e o comando de edição do início ao fim.
- Corrigir abertura, preenchimento, validação, carregamento, salvamento, mensagens e atualização automática.
- Manter apenas campos administrativos permitidos; proteger conteúdo clínico e dados sensíveis.
- Garantir que mudanças de cadastro, e-mail, situação, acesso e função administrativa sejam autorizadas no servidor e registradas no histórico.
- Desabilitar com explicação qualquer operação que não possa ser executada com segurança neste ambiente.

## 3. Pré-cadastro, aprovação e agendamento

- Validar geração, expiração e revogação do link; formulário público; envio; fila de revisão; duplicidades; edição; aprovação e recusa.
- Corrigir o comando de aprovação para criar ou vincular o paciente de forma atômica, atualizar a solicitação e refletir o resultado imediatamente.
- Preservar os estados existentes (`awaiting_approval`, `approved`, `rejected`) e o estado clínico já usado pelo paciente, sem inventar uma máquina paralela.
- Após aprovação, oferecer a continuidade pelo agendamento existente já preenchido com o paciente aprovado.
- Validar criação do atendimento, conflitos, persistência na agenda e histórico do paciente.

## 4. Revisão transversal da interface

- Auditar botões, links, cards, menus, abas, ícones, formulários e modais em todas as telas.
- Corrigir ações sem destino, rotas inexistentes, indicadores que parecem clicáveis sem ação e controles incompatíveis com o estado atual.
- Padronizar carregamento, bloqueio de clique duplicado, confirmação, sucesso e erro seguro.
- Verificar busca, filtros, limpeza, ordenação e paginação onde já fazem parte da tela.
- Validar notificações administrativas: leitura individual/coletiva, contador e destino específico.

## 5. Segurança e persistência

- Confirmar autorização no servidor e isolamento entre contas para pacientes, agenda, registros e suporte.
- Manter a administração restrita a metadados operacionais e contagens, sem conteúdo clínico.
- Validar que atualizações sobrevivem a recarga e novo acesso.
- Revisar alertas do banco e corrigir somente achados aplicáveis, sem ampliar acesso anônimo.

## 6. Validação ponta a ponta

- Usar identidades e dados fictícios descartáveis para testar administrador, profissional A, profissional B e paciente do pré-cadastro.
- Executar edição administrativa, pré-cadastro, aprovação, agendamento, recarga, logout/login e isolamento entre contas.
- Testar desktop e celular, estados inválidos, conflitos, sessão expirada e falta de permissão.
- Rodar testes automatizados, verificação de tipos, lint relevante, compilação e inspeção visual dos fluxos centrais.
- Remover os dados fictícios ao final e entregar a matriz consolidada: funcionalidades auditadas, problemas, correções, fluxos, botões, rotas, persistência, segurança e pendências.

## Detalhes técnicos

- Preservar TanStack Start, React Query, componentes existentes e regras de isolamento atuais.
- Manter páginas apenas como composição; lógica de dados continua nos módulos por domínio e operações privilegiadas permanecem no servidor.
- Mudanças de banco serão aditivas e transacionais, com permissões explícitas e políticas de acesso para qualquer nova estrutura pública.
- Não serão criados estados, contadores ou cadastros duplicados quando a informação já puder ser derivada das entidades atuais.

## Fora do escopo

- Reconstrução visual ou conceitual do produto.
- Exclusão de dados existentes.
- Novos módulos comerciais ou clínicos não necessários para completar os fluxos já apresentados.
- Simular sucesso apenas na interface quando não houver persistência real.