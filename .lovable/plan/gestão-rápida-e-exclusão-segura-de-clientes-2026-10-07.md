# Gestão rápida e exclusão segura de clientes

## Auditoria confirmada

- O usuário é a identidade de acesso; `profiles` guarda o cadastro profissional; `accounts` é a conta/tenant. Pacientes e registros clínicos pertencem à conta, não à administração.
- A lista busca todas as identidades e dados de nove consultas, incluindo pagamentos e eventos de uso, antes de pesquisar, ordenar e paginar em memória. A paginação atual não limita o trabalho no banco.
- A busca atual não inclui telefone. Cada alteração da busca dispara uma nova consulta pesada.
- O comando atual de exclusão apenas bloqueia a identidade e encerra a conta. Não exclui o perfil nem a identidade.
- A prévia verifica 13 conjuntos de dados, mas deixa de fora pré-cadastros, anamneses, evoluções, disponibilidade, bloqueios, catálogos, membros e outras dependências reais.
- O banco restringe a exclusão de contas vinculadas a históricos imutáveis. Trocar essa restrição por exclusão em cascata apagaria evidências e não será feito.
- Os erros enviados não foram reproduzidos: a página inicial respondeu 200, sem erros de navegador; `Features.tsx` e `Hero.tsx` retornam 404 e não são solicitados pela aplicação atual.

## Implementação

### 1. Lista leve e edição rápida

- Criar consulta administrativa protegida, com pesquisa por nome, e-mail, telefone e identificador, filtros, ordenação e paginação no banco.
- Retornar somente dados necessários à lista; não carregar históricos ou conteúdo clínico.
- Reutilizar o formulário de edição em uma janela aberta diretamente na lista, carregando apenas os campos cadastrais necessários.
- Preservar busca, filtros, página e posição; atualizar os dados afetados sem recarregar a aplicação.
- Aplicar espera curta à digitação da busca e índices pertinentes às consultas medidas.
- Substituir agregações administrativas volumosas por contagens e agregações no banco quando necessárias à visão geral.

### 2. Prévia completa e exclusão individual

- Consolidar a verificação dos vínculos em uma operação protegida, retornando somente contagens.
- Verificar todas as tabelas reais vinculadas à conta ou à identidade, além de arquivos; separar infraestrutura inicial, dados profissionais, dados clínicos/comerciais e históricos imutáveis.
- Proteger o próprio administrador, identidades administrativas e a conta prioritária já protegida.
- Bloquear exclusão quando houver pacientes, pré-cadastros, atendimentos, documentos, pacotes, pagamentos, assinaturas, suporte ou outros dados relevantes. Oferecer inativação nesses casos.
- Para uma conta vazia elegível, exigir confirmação específica, revalidar os vínculos no momento da operação e excluir realmente o perfil e a identidade de acesso.
- Remover a conta quando não houver histórico que exija sua preservação. Quando houver auditoria imutável, manter somente o registro mínimo de conta necessário à integridade histórica, identificado como arquivado; a interface deve distinguir isso de remoção integral.
- Registrar responsável, identificadores, horário e resultado sem conteúdo clínico. Não apresentar sucesso antes de confirmar o resultado.
- Não implementar exclusão em lote nesta etapa: a exclusão individual oferece controle e validação melhores para a limpeza inicial.
- Não remover contas existentes durante a implementação; os testes usarão somente identidades descartáveis criadas para esse fim.

### 3. Validação e desempenho

- Medir visão geral, lista, abertura da edição e detalhe antes/depois, com a mesma sessão administrativa e condições comparáveis.
- Testar edição com recarga, busca por telefone, paginação, preservação dos filtros e atualização da lista.
- Testar exclusão de conta descartável vazia, desaparecimento após recarga, ausência da identidade/perfil e preservação da auditoria.
- Testar recusa de conta descartável com vínculos, autoexclusão, identidade administrativa e profissional sem permissão.
- Executar testes automatizados das regras de elegibilidade e autorização; validar isolamento e confirmar que nenhum dado real foi apagado.
- Marcar como concluído somente o que tiver sido efetivamente exercitado.

## Detalhes técnicos

- Manter TanStack Start, funções de servidor autenticadas, autorização administrativa no servidor e no banco e os componentes existentes.
- Usar migrations aditivas para consultas/RPCs e índices; sem alterar tabelas gerenciadas de autenticação ou armazenamento.
- Não mudar chaves estrangeiras de históricos para cascata ou apagar auditorias. Remoção da identidade utiliza a operação administrativa de autenticação, com controle persistente das etapas e falhas; não será tratada como uma transação única com o banco.
- Revalidar elegibilidade e impedir novas escritas na conta durante a exclusão; a operação deve ser idempotente e recuperável se uma etapa externa falhar.
- Não expor conteúdo clínico, adicionar cobrança/PIX ou reconstruir autenticação, rotas e cadastros.

## Limitação da medição inicial

A sessão própria disponível não possui papel administrativo. As tentativas abriram uma tela de indisponibilidade, portanto os tempos observados não medem o carregamento real da administração. A medição e os testes administrativos exigem uma sessão autorizada; nenhuma permissão será concedida automaticamente para contornar essa restrição.