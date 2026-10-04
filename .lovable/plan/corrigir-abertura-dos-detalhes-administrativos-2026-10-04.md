# Corrigir abertura dos detalhes administrativos

## Objetivo
Garantir que “Ver detalhes” abra imediatamente a página do cadastro correto, sem permanecer em “Abrindo”, e que falhas de consulta terminem com mensagem clara e nova tentativa disponível.

## Implementação
- Substituir a navegação imperativa aguardada pelo link tipado da rota de detalhes, preservando o identificador selecionado.
- Deixar o carregamento dos dados na própria página de detalhes, que já é a responsável por consultar o cadastro.
- Tornar o erro da consulta acionável com botão “Tentar novamente”, sem inventar dados e sem depender de pagamento, assinatura ou perfil completo.
- Manter cadastros incompletos acessíveis com os campos disponíveis.

## Validação
- Verificar compilação e testes automatizados.
- Testar no navegador a abertura, fechamento/retorno, troca entre usuários e recuperação de falha quando houver sessão administrativa.
- Se a sessão administrativa continuar indisponível, registrar claramente essa limitação sem declarar o teste visual concluído.
