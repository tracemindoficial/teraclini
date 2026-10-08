# Auditoria TeraClini e próximos lotes de otimização

## Resultado da auditoria

O relatório completo está em `docs/teraclini-performance-architecture-audit.md`, organizado nas 12 seções solicitadas. Nenhuma otimização funcional ou migração foi executada.

- A página publicada responde HTTP 200; três imagens somam aproximadamente 2,70 MB.
- Leituras repetidas de acesso/perfil e consultas de diálogos fechados foram confirmadas no código e observadas na rede local.
- Listagens sem paginação e agregações representam riscos de crescimento, não lentidão atual comprovada.
- O catálogo confirma um índice duplicado de telemetria; o banco não apresentou exaustão na amostra.
- As 51 tabelas públicas têm RLS habilitada, mas isso não certifica todas as permissões.
- A suíte existente passou com 69 testes. Administração autorizada, mobile e regressão CRUD integral não foram validados nesta auditoria.

As medições locais de Vite não são benchmarks de produção. A navegação pode registrar telemetria operacional automaticamente; não houve edição deliberada de conteúdo clínico/financeiro.

## Lote proposto para esta aprovação

Implementar somente as duas ações da Prioridade 1:

1. **Imagens públicas:** produzir variantes otimizadas preservando arquivos originais, aparência e identidade; usar tamanhos e carregamento apropriados.
2. **Diálogos fechados:** adiar consultas desnecessárias até a abertura, mantendo pré-seleções, edição e campos dependentes.

Não alterar autorização, entidades, regras financeiras, conflitos da agenda, exclusões, URLs ou dados reais. Não remover dependências nem índices neste lote.

## Validação do lote

- Comparar bytes e requests antes/depois nas mesmas condições cold/warm.
- Testar abertura/fechamento, novo atendimento, edição, paciente pré-selecionado, local/sala, serviço/preço e pacote.
- Executar testes existentes e acrescentar cobertura para habilitação das consultas.
- Verificar apresentação desktop/mobile e regressões de navegação.
- Registrar claramente verificações bloqueadas ou pendentes; não marcar fluxos sem execução.

## Detalhes técnicos

Manter os assets originais e adicionar variantes por meio do gerenciamento de assets do projeto. Avaliar gates `enabled`/montagem nos hooks usados pelo `AppointmentDialog` e diálogos relacionados, sem violar regras de hooks ou impedir invalidação/refetch ao abrir.

## Lotes posteriores — exigem nova aprovação

- Prioridade 2: consolidar acesso/perfil com testes de segurança; paginação/busca no banco; medir RPCs com volume representativo.
- Prioridade 3: limpeza comprovada de scaffolds, índice duplicado e invalidação por domínio.
- Prioridade 4: extrações incrementais do shell/formulários e baseline autenticada publicada/mobile.

Não reescrever o produto nem modificar locks/FKs de preservação para obter ganho de performance.