# Auditoria e estabilização do MVP TeraClini

## Objetivo
Concluir a preparação técnica para lançamento sem criar novos módulos, usando somente contas e dados fictícios para validação.

## Diagnóstico já confirmado
- Acesso público: 28 verificações em 4 páginas e 7 larguras passaram sem erro de página ou rolagem horizontal.
- Banco: ativo, com baixa utilização; políticas de acesso habilitadas em todas as tabelas públicas e auditor automático sem alertas básicos.
- Desempenho atual do banco: consultas observadas abaixo de 22 ms no pior caso da amostra.
- Cobertura: não existem testes automatizados próprios.
- Segurança de dependências: dois alertas de alta severidade em dependência transitiva do framework.
- Fluxo ausente: recuperação e redefinição de senha.
- Riscos funcionais: exclusão de atendimento e local sem confirmação; edição de pacote em atendimento realizado gera erro tardio do banco; rótulo incompleto no histórico de pacotes; destaque duplo no menu de pré-cadastros.
- Funcionalidades parciais: disponibilidade, bloqueios e salas existem no código e banco, mas não estão acessíveis na interface; relatórios são apenas um resumo mensal.

## Correções seguras
1. Adicionar recuperação de senha completa, com solicitação pública e página pública para definir a nova senha.
2. Exigir confirmação antes de excluir atendimentos e locais, explicando o efeito sobre os registros relacionados.
3. Impedir alteração do pacote em atendimentos concluídos e apresentar orientação clara antes do envio.
4. Corrigir o rótulo de encerramento no histórico dos pacotes e o estado ativo do menu.
5. Corrigir apenas os problemas de qualidade de código que bloqueiem as verificações, sem refatoração ampla.
6. Atualizar os metadados incompletos das páginas públicas e internas existentes.

## Testes automatizados
- Adicionar testes unitários para cálculos e estados de pacotes.
- Adicionar testes de interface para autenticação pública, validações e confirmações destrutivas.
- Adicionar testes de integração seguros para conflitos de agenda, vínculos entre contas e políticas de acesso, sem dados reais.

## Validação com contas descartáveis
- Criar duas contas fictícias independentes e concluir onboarding.
- Validar login, logout, recuperação, perfil, pacientes, agenda, conflitos, conclusão/cancelamento, anamnese, evolução, documentos, pacotes e pré-cadastro.
- Tentar ler, alterar, excluir e relacionar dados da outra conta diretamente; todas as tentativas devem ser negadas.
- Conferir persistência após atualização, novo login e navegação.
- Repetir as telas principais em 320, 360, 390, 414, 768, 1024 e 1440 px.
- Remover os dados descartáveis quando a remoção puder ser feita sem risco; caso contrário, identificá-los claramente para limpeza autorizada.

## Limites desta etapa
- Não criar financeiro, equipes ou novos módulos.
- Não habilitar funcionalidades parciais de salas/disponibilidade sem uma decisão específica.
- Não executar migração destrutiva, carga em produção ou restauração de backup.
- Não declarar o produto pronto enquanto os fluxos autenticados e o isolamento entre contas não passarem.

## Entrega
Relatório com evidências por fluxo, correções, falhas, itens não verificados, riscos comerciais e ações restantes.
