# Gestão administrativa de clientes — validação

## 1. Causa da lentidão
A lista percorria identidades de autenticação em lotes de 1.000 (até 100 lotes) e carregava nove conjuntos inteiros, incluindo eventos e pagamentos; filtrava e paginava somente em memória. A visão geral também agregava linhas completas, sujeitas ao limite da API.

## 2. Correções
Consulta protegida única para lista, pesquisa no banco por nome/e-mail/telefone/IDs, filtros e ordenação com desempate estável, paginação antes da projeção final. Índices de eventos, pagamentos, assinaturas e situação. Espera de 300 ms na digitação; manutenção dos resultados durante atualização. Edição usa somente perfil operacional e identidade, reutilizando o formulário. Visão geral agrega no banco, sem carregar conteúdo clínico. Filtros/página permanecem durante edição.

## 3. Exclusão
Prévia de contagens, confirmação por e-mail, proteção no servidor e banco. Preparação transacional bloqueia escritas na conta; Auth remove efetivamente identidade/perfil; finalização limpa somente infraestrutura inicial, registra resultado e conserva conta mínima arquivada por integridade das auditorias. Operação persistida e idempotente; exclusões incompletas aparecem na lista para retomada. Nunca tratar inativação como exclusão.

## 4. Vínculos
Todas as tabelas atuais com account_id são inspecionadas por contagem, exceto infraestrutura inicial e históricos de auditoria que permanecem. Catálogos alterados/personalizados impedem exclusão. Incluídos outros membros, perfis, vínculos entre contas, ajuda e arquivos por proprietário/prefixo. Pacientes, anamneses, evoluções, atendimentos, pré-cadastros, arquivos, pacotes, pagamentos e suporte bloqueiam a operação. Não se retornam conteúdos clínicos.

## 5. Segurança
Chamadas administrativas autenticadas e autorizadas no servidor; RPCs executáveis somente pelo serviço privilegiado. Ator precisa de conta ativa/desbloqueada. Autoexclusão, identidades administrativas (inclusive registros revogados) e identidade prioritária protegidas. Bloqueio de reativação de conta em exclusão. Escritas do tenant compartilham lock com preparação para impedir corrida com transações já iniciadas.

## 6. Auditoria
Eventos append-only de preparação e conclusão, ator e identificadores, sem e-mail completo ou conteúdo clínico. Conta mínima preserva FKs; nenhum trigger de imutabilidade foi desativado. Corrigida em teste uma incompatibilidade do valor de resultado da preparação com a constraint existente.

## 7. Testes executados
- 56 testes Vitest aprovados (13 regras novas de elegibilidade).
- Sessão administrativa autorizada: lista de sete identidades, detalhe, abertura de edição e busca vazia sem erros de JavaScript.
- Conta QA recém-criada: editar telefone, salvar, pesquisar telefone, recarregar, abrir detalhe e excluir com confirmação.
- Lista deixou de encontrar QA; banco confirmou ausência de Auth/perfil, etapa completed e dois eventos de exclusão preservados.
- Prévia de conta vinculada mostrou contagens reais e botão desabilitado, sem alteração de dados reais.
- Próprio administrador: mensagem de autoexclusão e botão desabilitado.
- Visão geral e lista abriram sem estado de erro; build automático OK.

Não exercitados: falha externa simulada/retomada, corrida concorrente, mais de uma página real, isolamento completo com dois profissionais após esta mudança. Regras de proteção têm cobertura unitária; isso não substitui esses ensaios.

### Revisão de integridade e riscos pendentes
O lock compartilhado por escrita foi mantido: removê-lo permitiria que uma transação já iniciada criasse vínculos depois da contagem de preparação. Ele acrescenta uma consulta por linha escrita; seu custo e potenciais deadlocks em operações concorrentes precisam de ensaio de carga. A exclusão Auth ocorre após o commit da preparação e a finalização ocorre depois da chamada Auth, sem manter o lock de preparação entre essas etapas. Uma falha de FK no Auth não autoriza apagar vínculos: mantém a operação pendente para investigação/retomada, cuja recuperação ainda não foi testada com falha simulada. A limpeza final é explicitamente limitada a cinco tabelas de infraestrutura; novos módulos devem atualizar a revisão de dependências e locks antes de permitir exclusões. A conta administrativa ativa é um requisito atual das RPCs, não um teste de desempenho.

## 8. Dados preservados
Somente identidade QA criada nesta execução foi removida. Nenhuma conta preexistente, paciente, registro clínico, arquivo ou registro financeiro foi alterado/excluído para teste. Cadastros e auditorias existentes permanecem. Cobrança e PIX não implementados.

## 9. Performance
Primeiro carregamento observado da lista: 5.045 ms em desenvolvimento, incluindo navegação e preparação de módulos. Não existe baseline anterior com a mesma sessão autorizada; não declarar redução percentual. Esperas fixas de scripts posteriores não são medições de tempo de prontidão. A melhora estrutural está comprovada pelo caminho substituído (sem loop Auth nem transferência de históricos completos), não por benchmark antes/depois.
